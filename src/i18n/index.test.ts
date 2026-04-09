import { describe, expect, test } from "bun:test";
import { getI18nLocal } from "./index";

describe("getI18nLocal", () => {
  test("returns the locale key for exact locale codes", () => {
    expect(getI18nLocal("en")).toBe("en");
    expect(getI18nLocal("de")).toBe("de");
    expect(getI18nLocal("fr")).toBe("fr");
    expect(getI18nLocal("ja")).toBe("ja");
    expect(getI18nLocal("ko")).toBe("ko");
    expect(getI18nLocal("ru")).toBe("ru");
    expect(getI18nLocal("zh_CN")).toBe("zh_CN");
    expect(getI18nLocal("zh_TW")).toBe("zh_TW");
    expect(getI18nLocal("pl")).toBe("pl");
    expect(getI18nLocal("tr")).toBe("tr");
    expect(getI18nLocal("th")).toBe("th");
  });

  test("returns the locale key for full English language names", () => {
    expect(getI18nLocal("English")).toBe("en");
    expect(getI18nLocal("english")).toBe("en");
    expect(getI18nLocal("German")).toBe("de");
    expect(getI18nLocal("French")).toBe("fr");
    expect(getI18nLocal("Japanese")).toBe("ja");
    expect(getI18nLocal("Russian")).toBe("ru");
    expect(getI18nLocal("Korean")).toBe("ko");
    expect(getI18nLocal("Portuguese")).toBe("pt_br");
    expect(getI18nLocal("Spanish")).toBe("es_ES");
    expect(getI18nLocal("Swedish")).toBe("sv");
    expect(getI18nLocal("Turkish")).toBe("tr");
  });

  test("returns the locale key for native language names", () => {
    expect(getI18nLocal("Deutsch")).toBe("de");
    expect(getI18nLocal("française")).toBe("fr");
    expect(getI18nLocal("русский")).toBe("ru");
    expect(getI18nLocal("简体中文")).toBe("zh_CN");
    expect(getI18nLocal("繁體中文")).toBe("zh_TW");
    expect(getI18nLocal("にほんご")).toBe("ja");
    expect(getI18nLocal("한국어")).toBe("ko");
  });

  test("returns false for an unknown locale string", () => {
    expect(getI18nLocal("unknown")).toBe(false);
    expect(getI18nLocal("xyz")).toBe(false);
    expect(getI18nLocal("")).toBe(false);
    expect(getI18nLocal("  ")).toBe(false);
  });
});
