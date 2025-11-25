import { Graph } from '../graph/graph';

export function meta() {
  return [{ title: 'Task Status' }];
}

export const loader = async ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  const host = url.host;
  const pathname = url.pathname;

  return { url: request.url, host, pathname };
};

export default function Task() {
  return <Graph />;
}
