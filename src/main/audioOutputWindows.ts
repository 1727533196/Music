/** Read-only CoreAudio notification helper. One process per main window, no microphone access. */
export function windowsAudioOutputScript(once = false): string {
  return String.raw`
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

namespace Tinglan.AudioOutput {
  enum DataFlow { Render = 0, Capture = 1, All = 2 }
  enum Role { Console = 0, Multimedia = 1, Communications = 2 }
  [StructLayout(LayoutKind.Sequential)]
  struct PropertyKey { public Guid Format; public uint Id; }
  [StructLayout(LayoutKind.Explicit, Size = 24)]
  struct PropertyValue {
    [FieldOffset(0)] public ushort Type;
    [FieldOffset(8)] public IntPtr Pointer;
  }
  [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
  class DeviceEnumeratorClass { }
  [ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IDeviceEnumerator {
    [PreserveSig] int EnumAudioEndpoints(DataFlow flow, uint state, out IntPtr collection);
    [PreserveSig] int GetDefaultAudioEndpoint(DataFlow flow, Role role, out IDevice device);
    [PreserveSig] int GetDevice([MarshalAs(UnmanagedType.LPWStr)] string id, out IDevice device);
    [PreserveSig] int RegisterEndpointNotificationCallback(INotification callback);
    [PreserveSig] int UnregisterEndpointNotificationCallback(INotification callback);
  }
  [ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IDevice {
    [PreserveSig] int Activate(ref Guid iid, uint context, IntPtr parameters, out IntPtr instance);
    [PreserveSig] int OpenPropertyStore(uint access, out IPropertyStore store);
    [PreserveSig] int GetId(out IntPtr id);
    [PreserveSig] int GetState(out uint state);
  }
  [ComImport, Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IPropertyStore {
    [PreserveSig] int GetCount(out uint count);
    [PreserveSig] int GetAt(uint index, out PropertyKey key);
    [PreserveSig] int GetValue(ref PropertyKey key, out PropertyValue value);
    [PreserveSig] int SetValue(ref PropertyKey key, ref PropertyValue value);
    [PreserveSig] int Commit();
  }
  [Guid("7991EEC9-7E89-4D85-8390-6C703CEC60C0"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface INotification {
    [PreserveSig] int OnDeviceStateChanged([MarshalAs(UnmanagedType.LPWStr)] string id, uint state);
    [PreserveSig] int OnDeviceAdded([MarshalAs(UnmanagedType.LPWStr)] string id);
    [PreserveSig] int OnDeviceRemoved([MarshalAs(UnmanagedType.LPWStr)] string id);
    [PreserveSig] int OnDefaultDeviceChanged(DataFlow flow, Role role, [MarshalAs(UnmanagedType.LPWStr)] string id);
    [PreserveSig] int OnPropertyValueChanged([MarshalAs(UnmanagedType.LPWStr)] string id, PropertyKey key);
  }
  [ComVisible(true), ClassInterface(ClassInterfaceType.None)]
  class Notifications : INotification {
    readonly AutoResetEvent Changed;
    public Notifications(AutoResetEvent changed) { Changed = changed; }
    void Signal() { try { Changed.Set(); } catch (ObjectDisposedException) { } }
    public int OnDeviceStateChanged(string id, uint state) { Signal(); return 0; }
    public int OnDeviceAdded(string id) { Signal(); return 0; }
    public int OnDeviceRemoved(string id) { Signal(); return 0; }
    public int OnDefaultDeviceChanged(DataFlow flow, Role role, string id) {
      // Chromium's default HTMLMediaElement output follows eRender/eConsole, not the communications endpoint.
      if (flow == DataFlow.Render && role == Role.Console) Signal();
      return 0;
    }
    public int OnPropertyValueChanged(string id, PropertyKey key) { Signal(); return 0; }
  }
  public static class Observer {
    [DllImport("ole32.dll")] static extern int PropVariantClear(ref PropertyValue value);
    static string Quote(string value) {
      var result = new StringBuilder("\"");
      foreach (char c in value ?? "") {
        if (c == '"') result.Append("\\\"");
        else if (c == '\\') result.Append("\\\\");
        else if (c < 32) result.Append("\\u" + ((int)c).ToString("x4"));
        else result.Append(c);
      }
      return result.Append('"').ToString();
    }
    static void Release(object value) { if (value != null && Marshal.IsComObject(value)) Marshal.ReleaseComObject(value); }
    static void Emit(IDeviceEnumerator enumerator) {
      IDevice device = null; IPropertyStore store = null; IntPtr pointer = IntPtr.Zero;
      try {
        int status = enumerator.GetDefaultAudioEndpoint(DataFlow.Render, Role.Console, out device);
        if (status < 0 || device == null) { Console.WriteLine("{\"kind\":\"device\",\"available\":false}"); return; }
        Marshal.ThrowExceptionForHR(device.GetId(out pointer));
        string id = Marshal.PtrToStringUni(pointer);
        string label = "";
        if (device.OpenPropertyStore(0, out store) >= 0 && store != null) {
          var key = new PropertyKey { Format = new Guid("A45C254E-DF1C-4EFD-8020-67D146A850E0"), Id = 14 };
          PropertyValue value;
          if (store.GetValue(ref key, out value) >= 0) {
            try { if (value.Type == 31 && value.Pointer != IntPtr.Zero) label = Marshal.PtrToStringUni(value.Pointer); }
            finally { PropVariantClear(ref value); }
          }
        }
        Console.WriteLine("{\"kind\":\"device\",\"available\":true,\"id\":" + Quote(id) + ",\"label\":" + Quote(label) + "}");
      } catch (Exception error) {
        Console.WriteLine("{\"kind\":\"error\",\"code\":" + Quote(error.HResult.ToString("x8")) + "}");
      } finally {
        if (pointer != IntPtr.Zero) Marshal.FreeCoTaskMem(pointer);
        Release(store); Release(device);
      }
    }
    public static void Run(bool once) {
      IDeviceEnumerator enumerator = null;
      using (var changed = new AutoResetEvent(false))
      using (var stopped = new ManualResetEvent(false)) {
        Notifications callback = null; bool registered = false;
        try {
          enumerator = (IDeviceEnumerator)new DeviceEnumeratorClass();
          if (!once) {
            callback = new Notifications(changed);
            Marshal.ThrowExceptionForHR(enumerator.RegisterEndpointNotificationCallback(callback));
            registered = true;
          }
          Emit(enumerator);
          if (once) return;
          var input = new Thread(() => {
            try {
              string line;
              while ((line = Console.ReadLine()) != null && line != "stop") {
                if (line == "refresh") changed.Set();
              }
            } catch { }
            finally { stopped.Set(); }
          });
          input.IsBackground = true; input.Start();
          while (WaitHandle.WaitAny(new WaitHandle[] { stopped, changed }) == 1) {
            Thread.Sleep(80); // collapse related state/property/role notifications
            if (stopped.WaitOne(0)) break;
            Emit(enumerator);
          }
        } finally {
          if (registered) enumerator.UnregisterEndpointNotificationCallback(callback);
          Release(enumerator);
          GC.KeepAlive(callback);
        }
      }
    }
  }
}
'@
[Tinglan.AudioOutput.Observer]::Run($${once ? 'true' : 'false'})
`
}
