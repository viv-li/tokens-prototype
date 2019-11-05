import { setEndOfContenteditable, insertNodeAtCursor } from "./utils.js";

window.tokenFns = {
  onClickQuickAddToken: e => {
    const $token = $(
      `<span class="token draggable incomplete" contenteditable="false">
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
    window.TokenDrag.bindDraggables();

    setTimeout(() => {
      $token.find("input")[0].focus();
    }, 0);
  },

  addTokenAtCursor: () => {
    const $token = $(
      `<span class="token draggable incomplete" contenteditable="false">
        <input class="token__input" type="text" autofocus onkeydown="window.tokenFns.onKeyDownTokenInput(event)">
      </span>`
    );

    insertNodeAtCursor($token[0]);
    window.TokenDrag.bindDraggables();

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
      const elSpaceTextNode = document.createTextNode("\u00A0");
      $(elSpaceTextNode).insertAfter(elToken);
      setEndOfContenteditable(elSpaceTextNode);
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
  },

  closeTokensPanel: () => {
    $("#tokens-panel").addClass("hide");
    $(".inline-icon-button.tokens").removeClass("active");
  },

  onClickNavbarTokens: e => {
    e.stopPropagation();
    $("#tokens-panel .content-review").removeClass("hide");
    $("#tokens-panel .content-add").addClass("hide");
    $("#tokens-panel").toggleClass("hide");
    $(".inline-icon-button.tokens").toggleClass("active");
    window.tokenFns.renderTokensReview();
  },

  renderTokensReview: () => {
    if ($(".editor").find(".token").length === 0) {
      $("#tokens-panel .content-review .empty-state").removeClass("hide");
      $("#tokens-panel .content-review .tokens-summary").addClass("hide");
    } else {
      const $tokensSummary = $("#tokens-panel .content-review .tokens-summary");
      $tokensSummary[0].innerHTML = "";
      for (let elToken of document.querySelectorAll(".editor .token")) {
        const elClonedToken = $(elToken)
          .clone(true)
          .removeClass("draggable");
        $("<p/>")
          .append(elClonedToken)
          .appendTo($tokensSummary);
      }

      $("#tokens-panel .content-review .empty-state").addClass("hide");
      $("#tokens-panel .content-review .tokens-summary").removeClass("hide");
    }
  },

  onClickTokensPanelSwitchView: e => {
    e.stopPropagation();
    window.tokenFns.renderTokensReview();
    $("#tokens-panel .content-review").toggleClass("hide");
    const $addView = $("#tokens-panel .content-add").toggleClass("hide");
    // If we're in add view
    if (!$addView[0].classList.contains("hide")) {
      setTimeout(() => {
        $("#tokens-panel .tokens-filter").focus();
      }, 0);
    }
  },

  onKeyUpTokensPanelFilter: e => {
    e.stopPropagation();
    const filterString = e.target.value.toLowerCase();
    window.tokenFns.filterTokensList(filterString);
  },

  filterTokensList: filterString => {
    const tokensList = $("#tokens-panel .tokens-list").children("li");
    tokensList.each(i => {
      const elLi = tokensList[i];
      const tokenString = elLi
        .querySelector(".token")
        .textContent.toLowerCase();
      if (tokenString.includes(filterString)) {
        elLi.classList.remove("hide");
      } else {
        elLi.classList.add("hide");
      }
    });
  },

  onClickClearTokensFilter: e => {
    e.stopPropagation();
    $("#tokens-panel .tokens-filter")[0].value = "";
    window.tokenFns.filterTokensList("");
    setTimeout(() => {
      $("#tokens-panel .tokens-filter").focus();
    }, 0);
  }
};
