export function numberToWordsRu(num: number): string {
  if (num === 0) return "ноль";

  const ones = [
    "", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять",
    "десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать", "пятнадцать",
    "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать"
  ];

  const tens = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
  const hundreds = ["", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"];

  const thousands = ["", "тысяча", "тысячи", "тысяч"];

  function getThousandsForm(n: number): string {
    const lastTwo = n % 100;
    if (lastTwo >= 11 && lastTwo <= 19) return thousands[3];
    const last = n % 10;
    if (last === 1) return thousands[1];
    if (last >= 2 && last <= 4) return thousands[2];
    return thousands[3];
  }

  function convertThreeDigits(n: number, isThousands: boolean = false): string {
    let result = "";
    const h = Math.floor(n / 100);
    const t = n % 100;

    if (h > 0) result += hundreds[h] + " ";

    if (t > 0) {
      if (t < 20) {
        let word = ones[t];
        if (isThousands) {
          if (t === 1) word = "одна";
          if (t === 2) word = "две";
        }
        result += word + " ";
      } else {
        const ten = Math.floor(t / 10);
        const one = t % 10;
        result += tens[ten] + " ";
        if (one > 0) {
          let word = ones[one];
          if (isThousands) {
            if (one === 1) word = "одна";
            if (one === 2) word = "две";
          }
          result += word + " ";
        }
      }
    }

    return result;
  }

  let result = "";
  const thousandsCount = Math.floor(num / 1000);
  const remainder = num % 1000;

  if (thousandsCount > 0) {
    result += convertThreeDigits(thousandsCount, true) + getThousandsForm(thousandsCount) + " ";
  }

  if (remainder > 0) {
    result += convertThreeDigits(remainder, false);
  }

  return result.trim();
}

export function formatRublesInWords(amount: number): string {
  const rubles = Math.floor(amount);
  const kopecks = Math.round((amount - rubles) * 100);

  const rublesWords = numberToWordsRu(rubles);
  
  // Склонение рублей
  let rubleForm = "рублей";
  const lastTwo = rubles % 100;
  const lastOne = rubles % 10;
  if (lastTwo < 11 || lastTwo > 19) {
    if (lastOne === 1) rubleForm = "рубль";
    else if (lastOne >= 2 && lastOne <= 4) rubleForm = "рубля";
  }

  // Склонение копеек
  let kopeckForm = "копеек";
  const lastTwoK = kopecks % 100;
  const lastOneK = kopecks % 10;
  if (lastTwoK < 11 || lastTwoK > 19) {
    if (lastOneK === 1) kopeckForm = "копейка";
    else if (lastOneK >= 2 && lastOneK <= 4) kopeckForm = "копейки";
  }

  if (kopecks === 0) {
    return `${rublesWords} ${rubleForm} 00 ${kopeckForm}`;
  }

  const kopecksWords = kopecks.toString().padStart(2, "0");
  return `${rublesWords} ${rubleForm} ${kopecksWords} ${kopeckForm}`;
}
