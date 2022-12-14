
export function getEnglish(list) {
    return list.filter(n => n.language.name == "en")[0];
}