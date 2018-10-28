import OpenAPIBackend from '../src/index';
import { OpenAPIV3 } from 'openapi-types';

const headers = { accept: 'application/json' };

const responses: OpenAPIV3.ResponsesObject = {
  200: { description: 'ok' },
};

const pathId: OpenAPIV3.ParameterObject = {
  name: 'id',
  in: 'path',
  required: true,
  schema: {
    type: 'integer',
  },
};

const queryLimit: OpenAPIV3.ParameterObject = {
  name: 'limit',
  in: 'query',
  schema: {
    type: 'integer',
    minimum: 1,
    maximum: 100,
  },
};

const definition: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: {
    title: 'api',
    version: '1.0.0',
  },
  paths: {
    '/pets': {
      get: {
        operationId: 'getPets',
        responses,
      },
      post: {
        operationId: 'createPet',
        responses,
      },
      parameters: [queryLimit],
    },
    '/pets/{id}': {
      get: {
        operationId: 'getPetById',
        responses,
      },
      put: {
        operationId: 'replacePetById',
        responses,
      },
      patch: {
        operationId: 'updatePetById',
        responses,
      },
      delete: {
        operationId: 'deletePetById',
        responses,
      },
      parameters: [pathId],
    },
    '/pets/{id}/owner': {
      get: {
        operationId: 'getOwnerByPetId',
        responses,
      },
      parameters: [pathId],
    },
    '/pets/meta': {
      get: {
        operationId: 'getPetsMeta',
        responses,
      },
    },
  },
};

describe('Routing', () => {
  describe('matchOperation', () => {
    const api = new OpenAPIBackend({ definition });
    beforeAll(() => api.init());

    test('matches GET /pets', async () => {
      const { operationId } = api.matchOperation({ path: '/pets', method: 'get', headers });
      expect(operationId).toEqual('getPets');
    });

    test('matches POST /pets', async () => {
      const { operationId } = api.matchOperation({ path: '/pets', method: 'post', headers });
      expect(operationId).toEqual('createPet');
    });

    test('matches GET /pets/{id}', async () => {
      const { operationId } = api.matchOperation({ path: '/pets/1', method: 'get', headers });
      expect(operationId).toEqual('getPetById');
    });

    test('matches PUT /pets/{id}', async () => {
      const { operationId } = api.matchOperation({ path: '/pets/1', method: 'put', headers });
      expect(operationId).toEqual('replacePetById');
    });

    test('matches PATCH /pets/{id}', async () => {
      const { operationId } = api.matchOperation({ path: '/pets/1', method: 'patch', headers });
      expect(operationId).toEqual('updatePetById');
    });

    test('matches DELETE /pets/{id}', async () => {
      const { operationId } = api.matchOperation({ path: '/pets/1', method: 'delete', headers });
      expect(operationId).toEqual('deletePetById');
    });

    test('matches GET /pets/{id}/owner', async () => {
      const { operationId } = api.matchOperation({ path: '/pets/1/owner', method: 'get', headers });
      expect(operationId).toEqual('getOwnerByPetId');
    });

    test('matches GET /pets/meta', async () => {
      const { operationId } = api.matchOperation({ path: '/pets/meta', method: 'get', headers });
      expect(operationId).toEqual('getPetsMeta');
    });
  });

  describe('handleRequest', async () => {
    const dummyHandlers: { [operationId: string]: jest.Mock<any> } = {};
    const dummyHandler = (operationId: string) => (dummyHandlers[operationId] = jest.fn(() => ({ operationId })));
    const api = new OpenAPIBackend({
      definition,
      handlers: {
        getPets: dummyHandler('getPets'),
        getPetById: dummyHandler('getPetById'),
        createPet: dummyHandler('createPet'),
        updatePetById: dummyHandler('updatePetById'),
        notImplemented: dummyHandler('notImplemented'),
        notFound: dummyHandler('notFound'),
      },
    });
    beforeAll(() => api.init());

    test('handles GET /pets', async () => {
      const res = await api.handleRequest({ method: 'GET', path: '/pets', headers }, 'param0', 'param1');
      expect(res).toEqual({ operationId: 'getPets' });
      expect(dummyHandlers['getPets']).toBeCalledWith('param0', 'param1');
    });

    test('handles POST /pets', async () => {
      const res = await api.handleRequest({ method: 'POST', path: '/pets', headers }, 'param1', 'param2');
      expect(res).toEqual({ operationId: 'createPet' });
      expect(dummyHandlers['createPet']).toBeCalledWith('param1', 'param2');
    });

    test('handles GET /pets/1', async () => {
      const res = await api.handleRequest({ method: 'GET', path: '/pets/1', headers }, 'param2', 'param3');
      expect(res).toEqual({ operationId: 'getPetById' });
      expect(dummyHandlers['getPetById']).toBeCalledWith('param2', 'param3');
    });

    test('handles PATCH /pets/1', async () => {
      const res = await api.handleRequest({ method: 'PATCH', path: '/pets/1', headers }, 'param3', 'param4');
      expect(res).toEqual({ operationId: 'updatePetById' });
      expect(dummyHandlers['updatePetById']).toBeCalledWith('param3', 'param4');
    });

    test('handles a 404 for unregistered endpoint GET /humans', async () => {
      const res = await api.handleRequest({ method: 'GET', path: '/humans', headers }, 'param4', 'param5');
      expect(res).toEqual({ operationId: 'notFound' });
      expect(dummyHandlers['notFound']).toBeCalledWith('param4', 'param5');
    });

    test('handles a 501 for not implemented endpoint DELETE /pets/1', async () => {
      const res = await api.handleRequest({ method: 'DELETE', path: '/pets/1', headers }, 'param5', 'param6');
      expect(res).toEqual({ operationId: 'notImplemented' });
      expect(dummyHandlers['notImplemented']).toBeCalledWith('param5', 'param6');
    });

    test('handles GET /pets/ with trailing slash', async () => {
      const res = await api.handleRequest({ method: 'GET', path: '/pets/', headers }, 'param6', 'param7');
      expect(res).toEqual({ operationId: 'getPets' });
      expect(dummyHandlers['getPets']).toBeCalledWith('param6', 'param7');
    });

    test('handles GET /pets/?limit=10 with query string', async () => {
      const res = await api.handleRequest({ method: 'GET', path: '/pets/?limit=10', headers }, 'param7', 'param8');
      expect(res).toEqual({ operationId: 'getPets' });
      expect(dummyHandlers['getPets']).toBeCalledWith('param7', 'param8');
    });

    test('handles GET pets with no leading slash', async () => {
      const res = await api.handleRequest({ method: 'GET', path: 'pets', headers }, 'param8', 'param9');
      expect(res).toEqual({ operationId: 'getPets' });
      expect(dummyHandlers['getPets']).toBeCalledWith('param8', 'param9');
    });
  });
});
