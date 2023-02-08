import { decorateGithubOneboxBody } from "discourse/initializers/onebox-decorators";
import { withPluginApi } from "discourse/lib/plugin-api";
import highlightSyntax from "discourse/lib/highlight-syntax";
import I18n from "I18n";
import DiscourseURL from "discourse/lib/url";
import { samePrefix } from "discourse-common/lib/get-url";
import loadScript from "discourse/lib/load-script";
import { spinnerHTML } from "discourse/helpers/loading-spinner";
import { escapeExpression } from "discourse/lib/utilities";
import { emojiUnescape } from "discourse/lib/text";

export default {
  name: "chat-decorators",

  initializeWithPluginApi(api, container) {
    const siteSettings = container.lookup("service:site-settings");
    api.decorateChatMessage((element) => decorateGithubOneboxBody(element), {
      id: "onebox-github-body",
    });

    api.decorateChatMessage(
      (element) => {
        element
          .querySelectorAll(".onebox.githubblob li.selected")
          .forEach((line) => {
            const scrollingElement = this._getScrollParent(line, "onebox");

            // most likely a very small file which doesn’t need scrolling
            if (!scrollingElement) {
              return;
            }

            const scrollBarWidth =
              scrollingElement.offsetHeight - scrollingElement.clientHeight;

            scrollingElement.scroll({
              top:
                line.offsetTop +
                scrollBarWidth -
                scrollingElement.offsetHeight / 2 +
                line.offsetHeight / 2,
            });
          });
      },
      {
        id: "onebox-github-scrolling",
      }
    );

    api.decorateChatMessage(
      (element) =>
        highlightSyntax(
          element,
          siteSettings,
          container.lookup("service:session")
        ),
      { id: "highlightSyntax" }
    );

    api.decorateChatMessage(this.renderChatTranscriptDates, {
      id: "transcriptDates",
    });

    api.decorateChatMessage(this.forceLinksToOpenNewTab, {
      id: "linksNewTab",
    });

    api.decorateChatMessage(
      (element) =>
        this.lightbox(element.querySelectorAll("img:not(.emoji, .avatar)")),
      {
        id: "lightbox",
      }
    );

    api.decorateChatMessage(this._addUserStatusToMentions, {
      id: "mentionsUserStatus",
    });
  },

  _getScrollParent(node, maxParentSelector) {
    if (node === null || node.classList.contains(maxParentSelector)) {
      return null;
    }

    if (node.scrollHeight > node.clientHeight) {
      return node;
    } else {
      return this._getScrollParent(node.parentNode, maxParentSelector);
    }
  },

  renderChatTranscriptDates(element) {
    element.querySelectorAll(".chat-transcript").forEach((transcriptEl) => {
      const dateTimeRaw = transcriptEl.dataset["datetime"];
      const dateTimeLinkEl = transcriptEl.querySelector(
        ".chat-transcript-datetime a"
      );

      // we only show date for first message
      if (!dateTimeLinkEl) {
        return;
      }

      if (dateTimeLinkEl.innerText !== "") {
        // same as highlight, no need to do this for every single message every time
        // any message changes
        return;
      }

      if (this.currentUserTimezone) {
        dateTimeLinkEl.innerText = moment
          .tz(dateTimeRaw, this.currentUserTimezone)
          .format(I18n.t("dates.long_no_year"));
      } else {
        dateTimeLinkEl.innerText = moment(dateTimeRaw).format(
          I18n.t("dates.long_no_year")
        );
      }
    });
  },

  forceLinksToOpenNewTab(element) {
    const links = element.querySelectorAll(
      ".chat-message-text a:not([target='_blank'])"
    );
    for (let linkIndex = 0; linkIndex < links.length; linkIndex++) {
      const link = links[linkIndex];
      if (!DiscourseURL.isInternal(link.href) || !samePrefix(link.href)) {
        link.setAttribute("target", "_blank");
      }
    }
  },

  lightbox(images) {
    loadScript("/javascripts/jquery.magnific-popup.min.js").then(function () {
      $(images).magnificPopup({
        type: "image",
        closeOnContentClick: false,
        mainClass: "mfp-zoom-in",
        tClose: I18n.t("lightbox.close"),
        tLoading: spinnerHTML,
        image: {
          verticalFit: true,
        },
        callbacks: {
          elementParse: (item) => {
            item.src = item.el[0].src;
          },
        },
      });
    });
  },

  initialize(container) {
    if (container.lookup("service:chat").userCanChat) {
      withPluginApi("0.8.42", (api) =>
        this.initializeWithPluginApi(api, container)
      );
    }
  },

  _addUserStatusToMentions(element, chatChannel, message) {
    const mentions = element.querySelectorAll(`a.mention`);
    mentions.forEach((mention) => {
      // fixme andrei call here _updateUserStatus instead
      if (!message.mentioned_users || !message.mentioned_users.length === 0) {
        return;
      }
      const status = message.mentioned_users[0].status;
      mention.querySelector("img.user-status")?.remove();
      if (status) {
        const emoji = escapeExpression(`:${status.emoji}:`);
        const statusHtml = emojiUnescape(emoji, {
          class: "user-status",
          title: status.description,
        });
        mention.insertAdjacentHTML("beforeend", statusHtml);
      }
    });
  },

  // _rerenderUserStatusOnMentions() {
  //   // this._post()?.mentioned_users?.forEach((user) =>
  //   //   this._rerenderUserStatusOnMention(this.cookedDiv, user)
  //   // );
  // },
  //
  // _rerenderUserStatusOnMention(element, user) {
  //   // const href = getURL(`/u/${user.username.toLowerCase()}`);
  //   const mentions = element.querySelectorAll(`a.mention[href="${href}"]`);
  //
  //   mentions.forEach((mention) => {
  //     this._updateUserStatus(mention, user.status);
  //   });
  // },

  _updateUserStatus(mention, status) {
    this._removeUserStatus(mention);
    if (status) {
      this._insertUserStatus(mention, status);
    }
  },

  _insertUserStatus(mention, status) {
    const emoji = escapeExpression(`:${status.emoji}:`);
    const statusHtml = emojiUnescape(emoji, {
      class: "user-status",
      title: this._userStatusTitle(status),
    });
    mention.insertAdjacentHTML("beforeend", statusHtml);
  },
};
