import { API_URL } from '../../config/appConfig';
import { ApiHttp } from './apiHttp';
import { ApiMock } from './apiMock';
import type { ApiMeConta } from './contrato';

/**
 * Uma única instância para o app inteiro: a API de verdade quando há
 * `EXPO_PUBLIC_API_URL`, senão o modo de demonstração.
 */
export const api: ApiMeConta = API_URL ? new ApiHttp(API_URL) : new ApiMock();

export type { ApiMeConta } from './contrato';
