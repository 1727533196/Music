import ColorThief from 'colorthief'

let pointer = 1

export function colorExtraction(img: HTMLImageElement) {
  const colorThief = new ColorThief()
  return colorThief.getPalette(img) as Array<Array<string>>
}

export function gradualChange(img: HTMLImageElement, rgb: Array<Array<string>>) {
  const gradual1 = document.querySelector('#gradual1') as HTMLDivElement
  const gradual2 = document.querySelector('#gradual2') as HTMLDivElement
  if(img) {
    if(pointer === 0) {
      gradual1.style.backgroundImage = `linear-gradient(rgb(${rgb[0]}), rgb(${rgb[1]}))`
      gradual1.style.opacity = '1'

      gradual2.style.opacity = '0'
      pointer = 1
    } else {
      gradual2.style.backgroundImage = `linear-gradient(rgb(${rgb[0]}), rgb(${rgb[1]}))`
      gradual2.style.opacity = '1'

      gradual1.style.opacity = '0'
      pointer = 0
    }

  } else {
    if(pointer === 0) {
      gradual1.style.backgroundImage = ``
      gradual1.style.opacity = '1'

      gradual2.style.opacity = '0'
      pointer = 1
    } else {
      gradual2.style.backgroundImage = ``
      gradual2.style.opacity = '1'

      gradual1.style.opacity = '0'
      pointer = 0
    }
  }
}

export const useRhythm = (insertionEl) => {
  const style = document.createElement('style');
  document.head.appendChild(style);
  const stylesheet = style.sheet;

  const splitImg = (img) => {
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;
    const smallImageWidth = imgWidth / 2;
    const smallImageHeight = imgHeight / 2;
    let index = 0;
    const nodesLength = insertionEl.childNodes.length

    if(!nodesLength) {
      insertionEl.innerHTML = '';
    }
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        const cutCanvas = document.createElement('canvas');
        cutCanvas.width = smallImageWidth;
        cutCanvas.height = smallImageHeight;

        const cutCtx = cutCanvas.getContext('2d');

        cutCtx.drawImage(
          img,
          x * smallImageWidth,
          y * smallImageHeight,
          smallImageWidth,
          smallImageHeight,
          0,
          0,
          smallImageWidth,
          smallImageHeight
        );

        // 将canvas的内容转换为DataURL
        const imgUrl = cutCanvas.toDataURL('image/png');
        let imageElement = null
        // 创建img元素并设置其src属性
        if(!nodesLength) {
          imageElement = document.createElement('div');
          imageElement.style.backgroundImage = `url(${imgUrl})`;
          imageElement.style.width = '50vw';
          imageElement.style.height = '50vh';
          imageElement.style.position = 'absolute';
          imageElement.style.left = `${x * 50}vw`;
          imageElement.style.top = `${y * 50}vh`;
          imageElement.style.transition = `0.5s`;
          imageElement.style.backgroundSize = `cover`;

        } else {
          const node = insertionEl.childNodes[index]
          node.style.backgroundImage = `url(${imgUrl})`;
          node.style.width = '50vw';
          node.style.height = '50vh';
          node.style.position = 'absolute';
          node.style.left = `${x * 50}vw`;
          node.style.top = `${y * 50}vh`;
        }


        const deg = Math.floor(Math.random() * 360);
        const animationName = `cut-rotate-${index}`;

        stylesheet.insertRule(`
        @keyframes ${animationName} {
          from {
            transform: rotate(${deg}deg);
          }
          to {
            transform: rotate(${deg + 360}deg);
          }
        }
      `, stylesheet.cssRules.length);

        stylesheet.insertRule(`
        div.cut-image-${index} {
          animation: ${animationName} 80s infinite linear;
        }
      `, stylesheet.cssRules.length);

        if(imageElement && !nodesLength) {
          imageElement.classList.add(`cut-image-${index}`);
          insertionEl.appendChild(imageElement);
        }
        index++;
      }
    }
  };

  return {
    splitImg,
  };
};




