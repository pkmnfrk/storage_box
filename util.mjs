
export function getEnglish(list, fallback = {name:"?"}) {
    let ret = list.filter(n => n.language.name == "en")[0];
    if(!ret) {
        ret = fallback
    }
    return ret;
}