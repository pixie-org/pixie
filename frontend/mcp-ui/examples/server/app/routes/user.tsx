import { User } from '../user/user';

export function meta() {
  return [{ title: 'User' }];
}

export const loader = async ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  const queryParams = url.searchParams;

  return {
    user: {
      id: queryParams.get('id') || '',
      name: queryParams.get('name') || '',
      avatarUrl: queryParams.get('avatarUrl') || '',
    },
  };
};

export default function UserProfile({
  loaderData,
}: {
  loaderData: Awaited<ReturnType<typeof loader>>;
}) {
  const { user } = loaderData;
  return <User user={user} />;
}
