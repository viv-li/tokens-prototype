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

    $token.addClass("show-hint");
    setTimeout(() => {
      $token.removeClass("show-hint");
    }, 3000);

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
    window.tokenFns.onClickTokensPanelTabReview();
  },

  onClickNavbarTokens: e => {
    e.stopPropagation();
    $(".text-block").blur();
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
      const uniqueTokens = [];
      for (let elToken of document.querySelectorAll(".editor .token")) {
        if (!uniqueTokens.includes(elToken.textContent)) {
          const elClonedToken = $(elToken)
            .clone(true)
            .addClass("master");
          $("<p/>")
            .append(elClonedToken)
            .appendTo($tokensSummary);

          uniqueTokens.push(elToken.textContent);
          window.TokenDrag.bindDraggables();
        }
      }

      $("#tokens-panel .content-review .empty-state").addClass("hide");
      $("#tokens-panel .content-review .tokens-summary").removeClass("hide");
    }
  },

  onClickTokensPanelTabReview: e => {
    window.tokenFns.renderTokensReview();
    $("#tokens-panel .content-review").removeClass("hide");
    $("#tokens-panel .content-add").addClass("hide");
    $("#tokens-panel .tab-review").addClass("active");
    $("#tokens-panel .tab-add").removeClass("active");
  },

  onClickTokensPanelTabAdd: e => {
    $("#tokens-panel .content-review").addClass("hide");
    $("#tokens-panel .content-add").removeClass("hide");
    $("#tokens-panel .tab-review").removeClass("active");
    $("#tokens-panel .tab-add").addClass("active");
    setTimeout(() => {
      $("#tokens-panel .tokens-filter__input").focus();
    }, 0);
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
