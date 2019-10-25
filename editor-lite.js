import {
  getCaretCharacterOffsetWithin,
  setEndOfContenteditable
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
          class="text-block"
          contenteditable="true"
          onkeydown="window.editorFns.onKeyDownEditor(event)"
          onkeyup="window.editorFns.onKeyUpEditor(event)"
          onfocus="window.editorFns.onFocusEditor(event)"
          onblur="window.editorFns.onBlurEditor(event)"
        ></p>`
    );
    $newLine.insertAfter(elTextBlock);
    $newLine.focus();
    return $newLine[0];
  },

  // For key behaviour within editor text blocks
  onKeyDownEditor: e => {
    const key = event.key; // const {key} = event; ES6+

    // Adding new text block
    if (key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
    }

    // Deleting or merging text blocks across lines
    else if (key === "Backspace" || key === "Delete") {
      e.stopPropagation();
      // if block is empty try deleting it
      if (
        e.target.textContent === "" &&
        !e.target.classList.contains("undeletable") &&
        !$(e.target).is(":first-child")
      ) {
        e.preventDefault();
        setEndOfContenteditable(e.target.previousElementSibling);
        e.target.remove();
      }
      // merge with previous line if line not empty and caret is at beginning
      else if (
        getCaretCharacterOffsetWithin(e.target) === 0 &&
        !$(e.target).is(":first-child")
      ) {
        e.preventDefault();
        setEndOfContenteditable(e.target.previousElementSibling);
        for (let $el of $(e.target).contents()) {
          e.target.previousElementSibling.append($el);
          if (!e.target.classList.contains("undeletable")) {
            e.target.remove();
          }
        }
      }
    }

    // Start a token if you type {{
    else if (key === "{" && e.target.textContent.slice(-1) === "{") {
      e.preventDefault();
      const removeBracket = e.target.lastChild.textContent.slice(0, -1);
      e.target.lastChild.textContent = removeBracket;
      window.tokenFns.onClickQuickAddToken();
    }
  },

  onKeyUpEditor: e => {
    const key = event.key; // const {key} = event; ES6+
    window.editorFns.positionWidgetAdder(e.target.closest(".text-block"));
  },

  onFocusEditor: e => {
    window.editorFns.unselectAllWidgets();
    window.editorFns.positionWidgetAdder(e.target);
    window.lastFocussedLine = e.target;
  },

  positionWidgetAdder: elTextBlock => {
    const elWA = document.getElementById("widget-adder");
    const { top, left, height } = elTextBlock.getBoundingClientRect();
    // If it's an empty line position quick add beside it
    if (elTextBlock.textContent === "" || elTextBlock.textContent === "+") {
      elWA.style.top = `${window.scrollY + top + height / 2}px`;
    }

    // If the line with text is the last text block, position underneath
    else if (
      $(".editor")
        .children()
        .last()[0] === elTextBlock
    ) {
      elWA.style.top = `${window.scrollY + top + height / 2 + 46}px`;
    }

    // Put it after the last block
    else {
      const elLastBlock = $(".editor")
        .children()
        .last()[0];
      const { top, height } = elLastBlock.getBoundingClientRect();
      elWA.style.top = `${window.scrollY + top + height / 2 + 46}px`;
    }
    elWA.style.left = `${window.scrollX + left - 40}px`;
  },

  onBlurEditor: e => {
    if (e.target.id !== "widget-adder") {
      window.editorFns.hideWidgetAdder();
    }
  },
  hideWidgetAdder: () => {
    const elWA = document.getElementById("widget-adder");
    elWA.style.top = `-100px`;
    elWA.style.left = `-100px`;
    elWA.classList.remove("show-menu");
  },
  onClickWidgetAdder: e => {
    e.preventDefault();

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
  }
};

document.addEventListener("click", window.editorFns.onClick);
document.addEventListener("keydown", window.editorFns.onKeyDown);
