import { escapeExpression } from "discourse/lib/utilities";
import { emojiUnescape } from "discourse/lib/text";
import { until } from "discourse/lib/formatter";

export function updateUserStatusOnMention(mention, status, currentUser) {
  removeUserStatus(mention);
  if (status) {
    insertUserStatus(mention, status, currentUser);
  }
}

function insertUserStatus(mention, status, currentUser) {
  const emoji = escapeExpression(`:${status.emoji}:`);
  const statusHtml = emojiUnescape(emoji, {
    class: "user-status",
    title: userStatusTitle(status, currentUser),
  });
  mention.insertAdjacentHTML("beforeend", statusHtml);
}

function removeUserStatus(mention) {
  mention.querySelector("img.user-status")?.remove();
}

function userStatusTitle(status, currentUser) {
  if (!status.ends_at) {
    return status.description;
  }

  const until_ = until(
    status.ends_at,
    currentUser.timezone,
    currentUser.locale
  );
  return escapeExpression(`${status.description} ${until_}`);
}
