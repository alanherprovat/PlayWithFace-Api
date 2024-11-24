const weirdExpressions = [
    "a othoba b",
    // "b ebong c othoba d",
    // "ebong ebong othoba othoba ebong",
    // "((ebong) othoba ebong) ebong othoba",
    // "(ebong othoba (ebong ebong ((othoba)othoba(ebong))))",
    // "ebong",
  ];
  
  for (const expression of weirdExpressions) {
    console.log(convertExpression(expression));
  }
  function convertExpression(expression) {
    let output = "", currentWord = "", prevWord = false;
  
    for (let char of expression) {
        console.log('characterWord',currentWord)
      if (char === "(" || char === ")" || char === " ") {
        if (currentWord) {
          if (currentWord === "ebong" || currentWord === "othoba") {
            console.log('output',output)
            output += prevWord ? ` ${currentWord === "ebong" ? "&&" : "||"} ` : currentWord;
            prevWord = !prevWord;
          } else {
            output += currentWord + " ";
            prevWord = true;
          }
          currentWord = "";
        }
        output += char;
      } else {
        currentWord += char;
      }
    }
  
    return output + currentWord;
  }
  