/**
 * 简单的数学表达式解释器
 * 替代 eval()，提升性能和安全性
 * 支持 +, -, *, / 运算符和整数/浮点数
 */

export class ExpressionEvaluator {
  /**
   * 计算数学表达式的值
   * @param expr 表达式字符串，如 "3+5*2"
   * @returns 计算结果
   * @throws 如果表达式非法
   */
  static evaluate(expr: string): number {
    const tokens = this.tokenize(expr);
    return this.parseExpression(tokens);
  }

  /**
   * 将表达式字符串分解为 tokens
   */
  private static tokenize(expr: string): string[] {
    const tokens: string[] = [];
    let current = '';
    
    for (let i = 0; i < expr.length; i++) {
      const char = expr[i];
      
      // 跳过空格
      if (char === ' ') {
        if (current) {
          tokens.push(current);
          current = '';
        }
        continue;
      }
      
      // 运算符
      if (['+', '-', '*', '/'].includes(char)) {
        if (current) {
          tokens.push(current);
          current = '';
        }
        // 处理一元正负号：如果前面是运算符或者是开头，则作为数字符号
        if ((char === '-' || char === '+') && (tokens.length === 0 || ['+', '-', '*', '/'].includes(tokens[tokens.length - 1]))) {
          current = char;
        } else {
          tokens.push(char);
        }
      }
      // 数字或小数点
      else if (char >= '0' && char <= '9' || char === '.') {
        current += char;
      }
      else {
        throw new Error(`Invalid character: ${char}`);
      }
    }
    
    if (current) {
      tokens.push(current);
    }
    
    return tokens;
  }

  /**
   * 解析表达式（处理 + 和 -）
   */
  private static parseExpression(tokens: string[]): number {
    let result = this.parseTerm(tokens);
    
    while (tokens.length > 0) {
      const op = tokens[0];
      if (op !== '+' && op !== '-') {
        break;
      }
      tokens.shift(); // 消费运算符
      
      const right = this.parseTerm(tokens);
      if (op === '+') {
        result += right;
      } else {
        result -= right;
      }
    }
    
    return result;
  }

  /**
   * 解析乘除项（处理 * 和 /）
   */
  private static parseTerm(tokens: string[]): number {
    let result = this.parseFactor(tokens);
    
    while (tokens.length > 0) {
      const op = tokens[0];
      if (op !== '*' && op !== '/') {
        break;
      }
      tokens.shift(); // 消费运算符
      
      const right = this.parseFactor(tokens);
      if (op === '*') {
        result *= right;
      } else {
        if (right === 0) {
          throw new Error('Division by zero');
        }
        result /= right;
      }
    }
    
    return result;
  }

  /**
   * 解析因子（数字）
   */
  private static parseFactor(tokens: string[]): number {
    if (tokens.length === 0) {
      throw new Error('Unexpected end of expression');
    }
    
    const token = tokens.shift()!;
    const num = parseFloat(token);
    
    if (isNaN(num)) {
      throw new Error(`Invalid number: ${token}`);
    }
    
    return num;
  }
}
