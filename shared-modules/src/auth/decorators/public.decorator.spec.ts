import { Reflector } from '@nestjs/core';
import { Public } from './public.decorator';

describe('Public decorator', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  it('メソッドにisPublicメタデータを設定する', () => {
    class TestController {
      @Public()
      publicMethod() {
        return 'public';
      }

      privateMethod() {
        return 'private';
      }
    }

    const controller = new TestController();
    const publicMethodMetadata = reflector.get<boolean>('isPublic', controller.publicMethod);
    const privateMethodMetadata = reflector.get<boolean>('isPublic', controller.privateMethod);

    expect(publicMethodMetadata).toBe(true);
    expect(privateMethodMetadata).toBeUndefined();
  });

  it('クラスにisPublicメタデータを設定する', () => {
    @Public()
    class PublicController {
      method() {
        return 'method';
      }
    }

    class PrivateController {
      method() {
        return 'method';
      }
    }

    const publicClassMetadata = reflector.get<boolean>('isPublic', PublicController);
    const privateClassMetadata = reflector.get<boolean>('isPublic', PrivateController);

    expect(publicClassMetadata).toBe(true);
    expect(privateClassMetadata).toBeUndefined();
  });
});
