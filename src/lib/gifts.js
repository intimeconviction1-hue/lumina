export const GIFT_TAG = "cadeau";

export function isGiftTag(tag) {
  return typeof tag === "string" && ["cadeau", "cadeaux"].includes(tag.trim().toLowerCase());
}
