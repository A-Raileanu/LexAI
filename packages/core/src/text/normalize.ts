/**
 * Normalizarea textului românesc (diacritice, ghilimele, spații, numere de articol).
 * Implementarea e comună cu sursele, în @lexai/sources/text.
 */
export { containsLoose, looseKey, normalizeArticleNumber, normalizeRo, normalizeWithMap, parseRoDate, type NormalizeOptions, type NormalizedText } from "@lexai/sources/text";
