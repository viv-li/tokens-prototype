import { setEndOfContenteditable, insertNodeAtCursor } from "./utils.js";

window.tokenFns = {
  onClickQuickAddToken: e => {
    const $token = $(
      `<span class="token draggable incomplete" contenteditable="false">
        <input class="token__input" type="text"
          onkeydown="window.tokenFns.onKeyDownTokenInput(event)"
          onkeyup="window.tokenFns.onKeyUpTokenInput(event)"
          onfocus="window.tokenFns.onFocusTokenInput(event)"
          onblur="window.tokenFns.onBlurTokenInput(event)"
        >
      </span>`
    );
    const textBlock = window.lastFocussedLine;
    if (
      textBlock.hasChildNodes() &&
      textBlock.lastChild.nodeType === Node.TEXT_NODE &&
      !/\s$/.test(textBlock.lastChild.textContent)
    ) {
      textBlock.lastChild.textContent += "\u00A0";
    } else if (!textBlock.hasChildNodes()) {
      textBlock.append(document.createTextNode("\u00A0"));
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
    window.tokenFns.positionAndShowTokensTypeahead($token[0]);
  },

  addTokenAtCursor: () => {
    const $token = $(
      `<span class="token draggable incomplete" contenteditable="false">
        <input class="token__input" type="text"
          onkeydown="window.tokenFns.onKeyDownTokenInput(event)"
          onkeyup="window.tokenFns.onKeyUpTokenInput(event)"
          onfocus="window.tokenFns.onFocusTokenInput(event)"
          onblur="window.tokenFns.onBlurTokenInput(event)"
        >
      </span>`
    );

    insertNodeAtCursor($token[0]);
    window.TokenDrag.bindDraggables();

    setTimeout(() => {
      $token.find("input")[0].focus();
    }, 0);
    window.tokenFns.positionAndShowTokensTypeahead($token[0]);
  },

  positionAndShowTokensTypeahead: elToken => {
    const scrollTop = document.querySelector(".scroll-area").scrollTop;
    const elTypeahead = document.getElementById("tokens-typeahead");
    const { bottom, left } = elToken.getBoundingClientRect();

    elTypeahead.style.top = `${scrollTop + bottom + 8}px`;
    elTypeahead.style.left = `${left}px`;
    window.currentToken = elToken;

    const filterString = elToken.querySelector("input").value;
    const tokensList = $("#tokens-typeahead .tokens-list").children("li");
    window.tokenFns.filterTokensList(filterString, tokensList);
    window.tokenFns.showTokensTypeahead();
  },

  showTokensTypeahead: () => {
    $("#tokens-typeahead").removeClass("hide");
  },
  hideTokensTypeahead: () => {
    $("#tokens-typeahead .tokens-list")[0].scrollTo(top);
    $("#tokens-typeahead").addClass("hide");
  },

  onMouseDownTypeaheadToken: e => {
    e.stopPropagation();
    e.preventDefault();
    window.currentToken.querySelector("input").value = e.target.textContent;
    window.tokenFns.completeToken(window.currentToken);
  },

  onFocusTokenInput: e => {
    window.currentToken = e.target.closest(".token");
    window.tokenFns.positionAndShowTokensTypeahead(window.currentToken);
  },
  onBlurTokenInput: e => {
    window.tokenFns.hideTokensTypeahead();
  },
  onKeyUpTokenInput: e => {
    const filterString = e.target.value.toLowerCase();
    const tokensList = $("#tokens-typeahead .tokens-list").children("li");
    window.tokenFns.filterTokensList(filterString, tokensList);
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
    window.tokenFns.hideTokensTypeahead();
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
    window.tokenFns.hideTokensTypeahead();
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
    const tokensList = $("#tokens-panel .tokens-list").children("li");
    window.tokenFns.filterTokensList(filterString, tokensList);
  },

  filterTokensList: (filterString, tokensList) => {
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
    const tokensList = $("#tokens-panel .tokens-list").children("li");
    window.tokenFns.filterTokensList("", tokensList);
    setTimeout(() => {
      $("#tokens-panel .tokens-filter").focus();
    }, 0);
  }
};
