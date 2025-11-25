import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('task', 'routes/task.tsx'),
  route('user', 'routes/user.tsx'),
] satisfies RouteConfig;
