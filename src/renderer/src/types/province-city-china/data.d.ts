declare module 'province-city-china/data' {
    const province: Array<{
        code: string
        name: string
        province: string
    }>
    const city: Array<{}>

    export {
        province,
        city,
    }
}
