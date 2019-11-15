import {
  getCaretCharacterOffsetWithin,
  setEndOfContenteditable,
  insertNodeAtCursor
} from "./utils.js";

interact(".image-resizer")
  .resizable({
    edges: {
      top: ".resize-top",
      left: ".resize-left",
      bottom: ".resize-bottom",
      right: ".resize-right"
    },

    modifiers: [
      interact.modifiers.restrictSize({
        min: { width: 50 },
        max: { width: 800 }
      })
    ],

    inertia: true
  })
  .on("resizemove", function(event) {
    var target = event.target;
    var x = parseFloat(target.getAttribute("data-x")) || 0;
    var y = parseFloat(target.getAttribute("data-y")) || 0;

    // update the element's style
    target.style.width = event.rect.width + "px";

    // translate when resizing from top or left edges
    x += event.deltaRect.left;
    y += event.deltaRect.top;

    target.style.webkitTransform = target.style.transform =
      "translate(" + x + "px," + y + "px)";
  });

window.editorFns = {
  unselectAllWidgets: () => {
    for (let el of document.getElementsByClassName("image-resizer")) {
      el.classList.remove("selected");
    }
    for (let el of document.getElementsByClassName("editor-widget")) {
      el.classList.remove("selected");
    }
    window.editorFns.hideAllToolbars();
  },

  onClick: e => {
    window.editorFns.unselectAllWidgets();
    window.editorFns.closeWidgetAdderMenu();
  },

  closeWidgetAdderMenu: () => {
    $("#widget-adder").removeClass("show-menu");
  },

  // For key behaviour around widgets
  onKeyDown: e => {
    const key = event.key; // const {key} = event; ES6+
    if (key === "Backspace" || key === "Delete") {
      const selectedWidget = document.querySelector(".selected");
      if (selectedWidget !== null) {
        e.preventDefault();
        selectedWidget.remove();
        window.editorFns.hideAllToolbars();
      }
      return false;
    } else if (key === "Enter") {
      const selectedWidget = document.querySelector(".selected");
      if (selectedWidget !== null) {
        e.preventDefault();
        window.editorFns.createNewTextBlockAfter(selectedWidget);
        return false;
      }
    }
    return true;
  },
  positionToolbar: (elToolbar, elWidget) => {
    const { top, left, width } = elWidget.getBoundingClientRect();
    elToolbar.style.top = `${window.scrollY + top - 80}px`;
    elToolbar.style.left = `${window.scrollX + left + width / 2}px`;
  },
  hideAllToolbars: () => {
    for (let elToolbar of document.getElementsByClassName("toolbar")) {
      elToolbar.style.top = "-100px";
      elToolbar.style.right = "-100px";

      for (let elButton of elToolbar.getElementsByClassName(
        "toolbar__main__button"
      )) {
        elButton.classList.remove("open");
      }
      for (let elPanel of elToolbar.getElementsByClassName("toolbar__panel")) {
        elPanel.classList.remove("show");
      }
    }
  },

  createNewTextBlockAfter: elTextBlock => {
    const $newLine = $(
      `<p
          class="text-block dropzone"
          contenteditable="true"
          onkeydown="window.editorFns.onKeyDownEditor(event)"
          onkeyup="window.editorFns.onKeyUpEditor(event)"
          onfocus="window.editorFns.onFocusEditor(event)"
          onblur="window.editorFns.onBlurEditor(event)"
        ></p>`
    );
    $newLine.insertAfter(elTextBlock);
    window.TokenDrag.bindDropzones();
    $newLine.focus();
    return $newLine[0];
  },

  // For key behaviour within editor text blocks
  onKeyDownEditor: e => {
    const elTextBlock = e.target.closest(".text-block");
    const key = event.key; // const {key} = event; ES6+

    // Adding new text block
    if (key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      window.editorFns.createNewTextBlockAfter(elTextBlock);
    }

    // Deleting or merging text blocks across lines
    else if (key === "Backspace" || key === "Delete") {
      e.stopPropagation();
      // if block is empty try deleting it
      if (
        elTextBlock.textContent === "" &&
        !elTextBlock.classList.contains("undeletable") &&
        !$(elTextBlock).is(":first-child")
      ) {
        e.preventDefault();
        setEndOfContenteditable(elTextBlock.previousElementSibling);
        elTextBlock.remove();
      }
      // merge with previous line if line not empty and caret is at beginning
      else if (
        getCaretCharacterOffsetWithin(elTextBlock) === 0 &&
        !$(elTextBlock).is(":first-child")
      ) {
        e.preventDefault();
        const elPrevTextBlock = elTextBlock.previousElementSibling;
        setEndOfContenteditable(elPrevTextBlock);
        for (let el of $(elTextBlock).contents()) {
          elPrevTextBlock.appendChild(el);
          if (!elTextBlock.classList.contains("undeletable")) {
            elTextBlock.remove();
          }
        }
      }
    }

    // Start a token if you type {{
    else if (
      key === "{" &&
      window.lastKeyDownTextBlock === elTextBlock &&
      window.lastKeyDownKey === "{"
    ) {
      e.preventDefault();
      insertNodeAtCursor(document.createTextNode(""), 1);
      window.tokenFns.addTokenAtCursor();
    }

    window.lastKeyDownTextBlock = elTextBlock;
    window.lastKeyDownKey = key;
  },

  onKeyUpEditor: e => {
    const elTextBlock = e.target.closest(".text-block");
    window.editorFns.positionWidgetAdder(elTextBlock);
  },

  onFocusEditor: e => {
    window.editorFns.unselectAllWidgets();
    window.editorFns.positionWidgetAdder(e.target);
    e.target.classList.remove("hide-placeholder");
    window.lastFocussedLine = e.target;
  },

  positionWidgetAdder: elTextBlock => {
    const scrollTop = document.querySelector(".scroll-area").scrollTop;
    const navHeight = 68;
    const elWA = document.getElementById("widget-adder");
    const { top, left, height } = elTextBlock.getBoundingClientRect();
    // If it's an empty line position quick add beside it
    if (elTextBlock.textContent === "" || elTextBlock.textContent === "+") {
      elWA.style.top = `${scrollTop - navHeight + top + height / 2}px`;
    }

    // If the line with text is the last text block, position underneath
    else if (
      $(".editor")
        .children()
        .last()[0] === elTextBlock
    ) {
      elWA.style.top = `${scrollTop - navHeight + top + height / 2 + 46}px`;
    }

    // Put it after the last block
    else {
      const elLastBlock = $(".editor")
        .children()
        .last()[0];
      const { top, height } = elLastBlock.getBoundingClientRect();
      elWA.style.top = `${scrollTop - navHeight + top + height / 2 + 46}px`;
    }
    elWA.style.left = `${left - 40}px`;
  },

  onBlurEditor: e => {
    e.target.classList.add("hide-placeholder");
  },

  onClickWidgetAdder: e => {
    e.preventDefault();
    e.stopPropagation();

    if (window.lastFocussedLine.textContent !== "") {
      window.editorFns.createNewTextBlockAfter(window.lastFocussedLine);
    }
    const elWA = document.getElementById("widget-adder");
    elWA.classList.toggle("show-menu");
  },

  onClickModalImage: e => {
    if (window.elImagePlaceholder !== null) {
      window.editorFns.addImageToImagePlaceholder(e.target.src);
    } else {
      window.editorFns.addImageToEditor(e.target.src);
    }

    $("#image-gallery-modal").modal("toggle");
  },

  onClickAddImage: e => {
    e.preventDefault();
    window.elImagePlaceholder = null;
    $("#image-gallery-modal").modal();
  },

  addImageToEditor: imageUrl => {
    const $imageResizer = $(
      `<div class="image-resizer">
        <div class="resize-handle resize-top resize-left"></div>
        <div class="resize-handle resize-top resize-right"></div>
        <div class="resize-handle resize-bottom resize-left"></div>
        <div class="resize-handle resize-bottom resize-right"></div>
      </div>`
    );

    var elImg = new Image();
    elImg.onload = function() {
      // Get image width and set the resizer to that width
      const width = elImg.width;
      $imageResizer.width(width);
    };
    elImg.src = imageUrl;
    elImg.addEventListener("click", window.editorFns.onClickImage);
    $imageResizer.append(elImg);
    $imageResizer.insertBefore(window.lastFocussedLine);
  },

  onClickToolbarDelete: e => {
    e.stopPropagation();
    const selectedWidget = document.querySelector(".selected");
    if (selectedWidget !== null) {
      selectedWidget.remove();
      window.editorFns.hideAllToolbars();
    }
  },

  thisIsAPrototype: e => {
    e.preventDefault();
    e.stopPropagation();
    window.alert(
      "This is only a prototype, so this function has been disabled!"
    );
  }
};

document
  .querySelector("main")
  .addEventListener("click", window.editorFns.onClick);
document.addEventListener("keydown", window.editorFns.onKeyDown);
window.onload = () => {
  const startTextBlock = $("h1.text-block.undeletable");
  window.editorFns.positionWidgetAdder(startTextBlock[0]);
  setTimeout(() => {
    startTextBlock.focus();
  }, 0);
};
