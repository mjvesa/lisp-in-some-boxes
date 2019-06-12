let $ = document.querySelector.bind(document);

const childOf = (rectA, rectB) => {
  return (
    rectA.left > rectB.left &&
    rectA.top > rectB.top &&
    rectA.right < rectB.right &&
    rectA.bottom < rectB.bottom
  );
};

const isVerticalLayout = rect => {
  if (!rect.children || rect.children.length < 2) {
    return false;
  }
  let result = true;
  rect.children.forEach(outer => {
    rect.children.forEach(inner => {
      const hdiff = Math.abs(outer.left - inner.left);
      const vdiff = Math.abs(outer.top - inner.top);
      if (hdiff > vdiff) {
        result = false;
      }
    });
  });

  return result;
};

const isHorizontalLayout = rect => {
  if (!rect.children || rect.children.length < 2) {
    return false;
  }
  let result = true;
  rect.children.forEach(outer => {
    rect.children.forEach(inner => {
      const hdiff = Math.abs(outer.left - inner.left);
      const vdiff = Math.abs(outer.top - inner.top);
      if (hdiff < vdiff) {
        result = false;
      }
    });
  });

  return result;
};

const createTreeFromRects = rects => {
  const roots = [];
  rects.forEach(rect => {
    let smallestArea = 10000000;
    let potentialParent;
    rects.forEach(parentRect => {
      const area =
        Math.abs(parentRect.right - parentRect.left) *
        Math.abs(parentRect.bottom - parentRect.top);
      if (area < smallestArea && childOf(rect, parentRect)) {
        potentialParent = parentRect;
        smallestArea = area;
      }
    });
    if (potentialParent) {
      const children = potentialParent.children || [];
      children.push(rect);
      potentialParent.children = children;
    } else {
      roots.push(rect);
    }
  });
  return roots;
};

const deleteRectChildren = rects => {
  rects.forEach(rect => {
    delete rect.children;
  });
};

let suggestionElements = [];
let suggestionRects = [];

const getMatchRatio = (treeA, treeB) => {
  let matchLength = 0;
  treeA.forEach((item, index) => {
    if (item === treeB[index]) {
      matchLength++;
    }
  });
  return matchLength / treeA.length;
};

const rectRatio = rect => {
  const w = rect.right - rect.left;
  const h = rect.bottom - rect.top;
  return w / h;
};

const createSExpression = rects => {
  let sexprs = "";
  rects.forEach(rect => {
    if (isVerticalLayout(rect)) {
      rect.children.sort((rectA, rectB) => {
        return rectA.top - rectB.top;
      });
    }

    if (isHorizontalLayout(rect)) {
      rect.children.sort((rectA, rectB) => {
        return rectA.left - rectB.left;
      });
    }

    if (rect.children) {
      sexprs = sexprs.concat(
        `(${rect.text} ${createSExpression(rect.children)})`
      );
    } else if (!rect.text) {
      sexprs = sexprs.concat(`'()`);
    } else if (rect.text.includes('"') || !Number.isNaN(Number(rect.text))) {
      sexprs = sexprs.concat(`${rect.text} `);
    } else {
      sexprs = sexprs.concat(`(${rect.text}) `);
    }
  });
  return sexprs;
};

export const initLisb = (targetEl, designCallback) => {
  let rects = [];
  let draggedEl;
  let draggedRect = {};
  let originX, originY;
  let focusedElement;

  const run_code = () => {
    const biwascheme = new BiwaScheme.Interpreter(function(e) {
      console.error(e.message);
    });
    const source = $("#scheme-code").value;
    biwascheme.evaluate(source);
  };

  targetEl.innerHTML = `
  <style>
    #sketch-canvas {
        height: 100%;
    }
    #sketch-canvas div {
        border: solid 1px black;
        position: absolute;
      }
    #scheme-code {
      width: 100%;
      heigth: 8rem;
    } 
  </style>
  <button id="generate-button">&#955;</button>
  <div id="sketch-canvas"></div>
  <textarea id="scheme-code"></textarea>
  <button id="run-scheme">Run Scheme</button>`;

  const canvas = $("#sketch-canvas");

  const deleteRect = event => {
    if (event.key === "Delete") {
      if (focusedElement) {
        let newRects = [];
        rects.forEach(rect => {
          if (rect != focusedElement.rect) {
            newRects.push(rect);
          }
        });
        rects = newRects;
        canvas.removeChild(focusedElement);
      }
    }
  };

  canvas.onmousedown = event => {
    draggedEl = document.createElement("div");
    draggedEl.onkeyup = deleteRect;
    draggedRect = {};
    draggedEl.rect = draggedRect;
    draggedEl.contentEditable = true;
    draggedEl.oninput = event => {
      event.target.rect.text = event.target.textContent;
    };

    draggedEl.onmouseover = event => {
      event.target.focus();
      focusedElement = event.target;
    };

    originX = event.clientX;
    originY = event.clientY;
    draggedEl.style.position = "absolute";
    draggedEl.style.left = event.clientX + "px";
    draggedEl.style.top = event.clientY + "px";

    canvas.appendChild(draggedEl);
  };

  canvas.onmousemove = event => {
    if (draggedEl) {
      draggedEl.style.width = event.clientX - originX + "px";
      draggedEl.style.height = event.clientY - originY + "px";
      Object.assign(draggedRect, {
        left: originX,
        top: originY,
        right: event.clientX,
        bottom: event.clientY
      });
    }
  };

  canvas.onmouseup = () => {
    rects.push(draggedRect);
    draggedEl = undefined;
  };

  $("#generate-button").onclick = event => {
    deleteRectChildren(rects);
    let roots = createTreeFromRects(rects);
    $("#scheme-code").value = createSExpression(roots);
  };
  $("#run-scheme").onclick = run_code;
};
