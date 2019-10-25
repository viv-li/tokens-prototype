import { setEndOfContenteditable } from "./utils.js";

window.tokenFns = {
  onClickQuickAddToken: e => {
    const $token = $(
      `<span class="token incomplete" contenteditable="false">
        <input class="token__input" type="text" autofocus onkeydown="window.tokenFns.onKeyDownTokenInput(event)">
      </span>`
    );
    const textBlock = window.lastFocussedLine;
    if (
      textBlock.hasChildNodes() &&
      textBlock.lastChild.nodeType === Node.TEXT_NODE &&
      !/\s$/.test(textBlock.lastChild.textContent)
    ) {
      textBlock.lastChild.textContent += "\u00A0";
    }
    $token.appendTo(textBlock);
    setTimeout(() => {
      $token.find("input")[0].focus();
    }, 0);
  },
  onKeyDownTokenInput: e => {
    const key = event.key; // const {key} = event; ES6+
    const elToken = e.target.parentElement;

    // Completing the token
    if (key === "Enter" || (key === "}" && e.target.value.slice(-1) === "}")) {
      e.preventDefault();
      e.stopPropagation();
      window.tokenFns.completeToken(elToken);

      // Removing the token
    } else if (key === "Backspace" || key === "Delete") {
      e.stopPropagation(); // Don't propagate to editor event handler
      if (e.target.value === "") {
        e.preventDefault();
        window.tokenFns.removeToken(elToken);
      }
    }
  },
  completeToken: elToken => {
    const elTokenInput = elToken.querySelector("input");
    const tokenValue = elTokenInput.value.replace(/}$/, "");
    if (tokenValue === "") {
      setEndOfContenteditable(elToken.parentElement);
      window.tokenFns.removeToken(elToken);
    } else {
      elToken.innerHTML = tokenValue;
      elToken.classList.remove("incomplete");
      elToken.parentElement.appendChild(document.createTextNode("\u00A0"));
      setEndOfContenteditable(elToken.parentElement);
    }
  },
  removeToken: elToken => {
    const elPrevNode = elToken.previousSibling;
    const elTextBlock = elToken.closest(".text-block");
    if (elPrevNode !== null) {
      setEndOfContenteditable(elPrevNode);
    } else {
      setEndOfContenteditable(elTextBlock);
    }
    elToken.remove();
  }
};
