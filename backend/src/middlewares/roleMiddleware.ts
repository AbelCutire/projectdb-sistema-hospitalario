import { Request, Response, NextFunction } from 'express';

export const roleMiddleware = (...requiredRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({ error: 'No autorizado. Se requiere token.' });
      }

      if (!requiredRoles.includes(user.rol)) {
        return res.status(403).json({ error: `Acceso denegado. Se requiere rol: ${requiredRoles.join(' o ')}` });
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Error interno en la validación de roles.' });
    }
  };
};
