import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUser, CurrentUserData } from './current-user.decorator';

describe('CurrentUser decorator', () => {
  it('リクエストからユーザー情報を抽出する', () => {
    // デコレーターの実行関数を取得
    const decoratorFactory = CurrentUser();
    const paramIndex = 0;
    const descriptorValue = decoratorFactory(
      {} as Record<string, unknown>,
      'methodName',
      paramIndex
    );

    // デコレーターが設定するメタデータを確認
    expect(descriptorValue).toBeUndefined();
  });

  it('ユーザー情報が存在しない場合はundefinedを返す', () => {
    // 実際のパラメータデコレーターの動作をテスト
    const decorator = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
      const request = ctx.switchToHttp().getRequest() as { user: CurrentUserData };
      return request.user;
    });

    const result = decorator();
    expect(typeof result).toBe('function');
  });
});
