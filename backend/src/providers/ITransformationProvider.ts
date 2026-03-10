/**
 * 变换提供者接口
 * 定义了获取火柴棒字符变换的统一接口
 */
export interface ITransformationProvider {
  /**
   * 连接到数据源
   */
  connect(): Promise<void>;

  /**
   * 断开连接
   */
  disconnect(): Promise<void>;

  /**
   * 获取字符的变换结果
   * @param character 原字符
   * @param mode 模式 ('standard' | 'handwritten')
   * @param operation 操作类型 ('MOVE_1', 'ADD_1', 'REMOVE_1', 'MOVE_2', 'ADD_2', 'REMOVE_2', 'MOVE_SUB', 'MOVE_ADD')
   * @returns 变换后的字符列表
   */
  getTransformations(character: string, mode: string, operation: string): Promise<string[]>;

  /**
   * 获取提供者名称
   */
  getProviderName(): string;
}
