/* jshint esversion: 6 */

function AnnotationDrag(args) {
  /*
   * Draggable elements
   */
  this.$draggables = null;

  /*
   * Drop Zones
   */
  this.$dropzones = null;

  /*
   * No Drag Elements
   * (optional)
   */
  this.$noDrags = null;

  /*
   * Draggable Content Bucket
   * Temporary place for elements/nodes being dragged
   */
  this.dropLoad = null;
  this.dropLoadNode = null;

  /*
   * Space node generator
   */
  this.generateSpaceNode = () => document.createTextNode("\u00A0");

  /*
   * Drag source marker generator
   * Indicates the original place before dropping
   */
  this.sourceMarkerClassName = "source-marker";
  this.generateSourceMarker = () => {
    const marker = document.createElement("span");
    marker.className = this.sourceMarkerClassName;
    return marker;
  };

  /*
   * Regex specifying before and after characters that may
   */
  this.allowedRegexBefore = new RegExp(/[\s\(\[]/, "g");
  this.allowedRegexAfter = new RegExp(/[\s\.\,\!\?\)\]]/, "g");

  /*
   * Callbacks
   */
  this.onDragStartCallback = null;
  this.onDragEndCallback = null;
  this.onDropCallback = null;

  /*
   * Bind Draggable Elements
   */
  this.bindDraggables = () => {
    // Re-select
    this.$draggables = $(this.$draggables.selector);
    this.$noDrags = $(this.$noDrags.selector);

    // Set no-draggables as such
    this.$noDrags.attr("draggable", "false");

    // Bind draggable dragstart
    this.$draggables.off("dragstart").on("dragstart", this.onDragStart);
    this.$draggables.off("dragend").on("dragend", this.onDragEnd);
  };

  /*
   * Bind Dropzones Elements
   */
  this.bindDropzones = () => {
    this.$dropzones = $(this.$dropzones.selector); // reselecting
    this.$dropzones.off("dragleave").on("dragleave", this.onDragLeave);
    this.$dropzones.off("drop").on("drop", this.onDrop);
  };

  /*
   * Handle annotation drag start
   */
  this.onDragStart = event => {
    const e = event.originalEvent;
    const target = e.target;
    $(target).removeAttr("dragged");

    const isDraggable = this.$draggables.is(target);
    if (isDraggable) {
      // Remove any selection when drag starts
      var currentSelection = window.getSelection();
      if (currentSelection.toString().length > 0) {
        currentSelection.removeAllRanges();
      }

      if (typeof this.onDragStartCallback === "function") {
        this.onDragStartCallback(event);
      }

      const dt = e.dataTransfer;
      const content = e.target.outerHTML;

      /*
       * Leave marker in source
       * This allows to handle any whitespace left behind
       * After drop ends
       */
      if (!target.classList.contains("master")) {
        // @viv: don't worry about leaving whitespace behind if it's a master, because we clone from it
        const afterRange = this.getRangeAfterNode(target, 1);
        afterRange.insertNode(this.generateSourceMarker());
      }

      dt.effectAllowed = "copy";
      dt.setData("text/plain", " ");
      this.dropLoad = content;
      this.dropLoadNode = e.target;
      $(e.target).attr("dragged", "dragged");
      $("#widget-adder").addClass("hide");
    }
  };

  this.onDragLeave = event => {
    const e = event.originalEvent;

    const dt = e.dataTransfer;
    const relatedTargetIsDropzone = this.$dropzones.is(e.relatedTarget);
    const relatedTargetWithinDropzone =
      this.$dropzones.has(e.relatedTarget).length > 0;
    const acceptable = relatedTargetIsDropzone || relatedTargetWithinDropzone;
    if (!acceptable) {
      dt.dropEffect = "none";
      dt.effectAllowed = "null";
    }
  };

  /*
   * Handle annotation drop
   */
  this.onDrop = event => {
    const e = event.originalEvent;
    e.preventDefault();

    // No load to drop, exit
    if (!this.dropLoad) {
      return false;
    }

    // Get range and selection from event
    const rangeWithSelection = this.getRangeWithSelectionFromDrop(e);
    const range = rangeWithSelection.range;
    const sel = rangeWithSelection.selection;

    // Check if a space before is needed
    const beforeRange = this.getRangeBeforeRange(range, 1);
    const needsSpaceBefore =
      beforeRange.toString().match(this.allowedRegexBefore) === null;

    // Check if a space after is needed
    const afterRange = this.getRangeAfterRange(range, 1);
    const needsSpaceAfter =
      afterRange.toString().match(this.allowedRegexAfter) === null;

    const dropTarget = $(sel.anchorNode)
      .closest(this.$dropzones.selector)
      .get(0);
    dropTarget.focus(); // essential

    // Insert in original range before node was placed so it gets pushed to the right
    if (needsSpaceAfter) {
      range.insertNode(this.generateSpaceNode());
    }

    // Insert drop load at target
    if (this.dropLoadNode.classList.contains("master")) {
      const clonedNode = this.dropLoadNode.cloneNode(true);
      clonedNode.classList.remove("master");
      range.insertNode(clonedNode);
      window.tokenFns.positionAndShowTokensHint(clonedNode);
    } else {
      range.insertNode(this.dropLoadNode);
      window.tokenFns.hideTokensHint();
    }

    // Insert in original range after node was placed so it stays before
    if (needsSpaceBefore) {
      range.insertNode(this.generateSpaceNode());
    }

    sel.removeAllRanges();
    dropTarget.normalize();

    // Reset and normalize state
    this.dropLoad = null;
    this.dropLoadNode = null;
    this.bindDraggables(); // The html changed, update all binds

    if (typeof this.onDropCallback === "function") {
      this.onDropCallback(event);
    }
  };

  /*
   * Handle annotation drag end
   * Remove existing markers after drop
   */
  this.onDragEnd = event => {
    const markers = this.$dropzones.find("." + this.sourceMarkerClassName);
    markers.get().map(this.removeMarker);
    if (typeof this.onDragEndCallback === "function") {
      this.onDragEndCallback(event);
    }
    $("#widget-adder").removeClass("hide");
  };

  this.getRangeFromDrop = e => {
    let range = null;
    if (document.caretRangeFromPoint) {
      // Chrome
      range = document.caretRangeFromPoint(e.clientX, e.clientY);
    } else if (e.rangeParent) {
      // Firefox
      range = document.createRange();
      range.setStart(e.rangeParent, e.rangeOffset);
    }
    return range;
  };

  this.getSelectionFromRange = range => {
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    return selection;
  };

  this.getRangeWithSelectionFromDrop = e => {
    const range = this.getRangeFromDrop(e);
    const selection = this.getSelectionFromRange(range);

    return {
      range,
      selection
    };
  };

  this.getRangeBeforeRange = (sourceRange, length) => {
    if (!length) {
      length = 1;
    }
    const range = new Range();

    // Is new start acceptable?
    let newStart = sourceRange.endOffset - length;
    if (newStart < 0) {
      newStart = 0;
    }

    range.setStart(sourceRange.endContainer, newStart);
    range.setEnd(sourceRange.endContainer, sourceRange.endOffset);
    return range;
  };

  this.getRangeAfterRange = (sourceRange, length) => {
    if (!length) {
      length = 1;
    }
    const range = new Range();

    // Is new end acceptable?
    let newEnd = sourceRange.endOffset + length;
    if (
      newEnd > sourceRange.endContainer.length ||
      sourceRange.endContainer.length === undefined // @viv: added this for empty block
    ) {
      newEnd = sourceRange.endOffset;
    }
    range.setStart(sourceRange.endContainer, sourceRange.endOffset);
    range.setEnd(sourceRange.endContainer, newEnd);
    return range;
  };

  this.getRangeBeforeNode = (node, length) => {
    const previousSibling = node.previousSibling;
    const beforeRange = document.createRange();
    if (previousSibling) {
      const previousSiblingLength = previousSibling.length;
      beforeRange.setStart(
        previousSibling,
        previousSiblingLength > 0 ? previousSiblingLength - 1 : 0
      );
      beforeRange.setEnd(previousSibling, previousSiblingLength);
    } else {
      beforeRange.setStartBefore(node, 0);
      beforeRange.setEndBefore(node, 0);
    }
    return beforeRange;
  };

  this.getRangeAfterNode = (node, length) => {
    const nextSibling = node.nextSibling;
    const afterRange = document.createRange();
    if (nextSibling) {
      afterRange.setStart(nextSibling, 0);
      afterRange.setEnd(nextSibling, 1);
    } else {
      afterRange.setStartAfter(node, 0);
      afterRange.setEndAfter(node, 0);
    }
    return afterRange;
  };

  this.removeMarker = marker => {
    const markerParent = marker.parentNode;
    this.normalizeDroppable(markerParent);

    // Get previous char
    const beforeRange = this.getRangeBeforeNode(marker, 1);
    const beforeRangeContent = beforeRange.toString();

    // Get next char
    const afterRange = this.getRangeAfterNode(marker, 1);
    const afterRangeContent = afterRange.toString();

    /*
     * Remove duplicate spaces if marker
     * Is between allowed elements
     */
    if (
      beforeRangeContent.match(this.allowedRegexAfter) !== null &&
      afterRangeContent.match(this.allowedRegexAfter) !== null
    ) {
      if (beforeRangeContent.match(/\s/) !== null) {
        beforeRange.deleteContents();
      } else if (afterRangeContent.match(/\s/) !== null) {
        afterRange.deleteContents();
      }
    }

    marker.remove();
    this.normalizeDroppable(markerParent);
  };

  this.normalizeDroppable = droppable => {
    droppable.normalize();
  };

  /*
   * Init
   */
  this.init = () => {
    this.$draggables = $(args.draggables);
    this.$dropzones = $(args.dropzones);
    this.$draggables.attr("draggable", "true");
    this.$noDrags = args.noDrags ? $(args.noDrags) : $();
    this.$dropzones.attr("dropzone", "copy");
    this.onDragStartCallback = args.onDragStart ? args.onDragStart : null;
    this.onDragEndCallback = args.onDragEnd ? args.onDragEnd : null;
    this.onDropCallback = args.onDrop ? args.onDrop : null;
    this.bindDraggables();
    this.bindDropzones();
  };

  /*
   * Destroy
   */
  this.disengage = () => {
    this.$draggables = $(this.$draggables.selector); // reselections
    this.$dropzones = $(this.$dropzones.selector);
    this.$noDrags = $(this.$noDrags.selector);
    this.$draggables
      .removeAttr("draggable")
      .removeAttr("dragged")
      .off("dragstart");
    this.$noDrags.removeAttr("draggable");
    this.$dropzones.removeAttr("droppable").off("dragenter");
    this.$dropzones.off("drop");
  };

  // Init
  if (args) {
    this.init();
  }
}

$(function() {
  window.TokenDrag = new AnnotationDrag({
    draggables: ".draggable",
    dropzones: ".dropzone"
  });
});

/*
Initially seen on http://jsfiddle.net/ChaseMoskal/T2zHQ/ by Chase Moskal
==== Dragon Drop: a demo of precise DnD
          in, around, and between 
	     multiple contenteditable's.

=================================
== MIT Licensed for all to use ==
=================================
Copyright (C) 2013 Chase Moskal

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
============
*/
