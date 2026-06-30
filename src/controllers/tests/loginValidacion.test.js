

const bcrypt = require('bcrypt');

//  Mocks 
jest.mock('../../config/db', () => ({
  query: jest.fn(),
}));
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

const pool        = require('../../config/db');
const { login }   = require('../authController');


const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};


// CP-CN-LOG-02 | Rechazar credenciales incorrectas

describe('CP-CN-LOG-02 — Rechazar credenciales incorrectas', () => {

  beforeEach(() => jest.clearAllMocks());

  
  test('debe retornar 401 cuando la contraseña no coincide con el usuario registrado', async () => {
    
    pool.query.mockResolvedValueOnce({
      rows: [{
        id_usuario: 5,
        correo: 'secretaria@clubposeidon.com',
        contrasena: '$2b$10$hasheada',
        id_rol: 2,
        nombres: 'Rosa',
        apellidos: 'Astorga',
      }],
    });

    
    bcrypt.compare.mockResolvedValueOnce(false);

    const req = { body: { correo: 'secretaria@clubposeidon.com', contrasena: 'contraseña-incorrecta' } };
    const res = mockRes();

    await login(req, res);

    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      mensaje: 'Correo o contraseña incorrectos',
    });
  });

  
  test('debe retornar error de credenciales cuando el usuario no está registrado', async () => {
    
    pool.query.mockResolvedValueOnce({ rows: [] });

    const req = { body: { correo: 'noexiste@clubposeidon.com', contrasena: 'cualquier123' } };
    const res = mockRes();

    await login(req, res);

    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      mensaje: 'Correo o contraseña incorrectos',
    });
  });

});
