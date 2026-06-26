// Carrega o ambiente de teste (banco isolado neuralabs_test) antes dos testes
// de integração. cwd = backend/ quando rodado via npm.
import { config } from 'dotenv';

config({ path: '.env.test' });
