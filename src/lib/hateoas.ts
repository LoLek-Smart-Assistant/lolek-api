export interface HATEOASLink {
  rel: string;
  href: string;
  method?: string;
}

export interface HATEOASResponse<T> {
  data: T;
  links: HATEOASLink[];
}

export interface HATEOASData extends Record<string, any> {
  platform?: string;
}

export function addHATEOASLinks<T extends HATEOASData>(
  data: T,
  resourceName: string,
  id?: string | any,
  baseUrl = 'http://localhost:3000'
): HATEOASResponse<T> {
  const links: HATEOASLink[] = [];

  // Self link
  if (id) {
    links.push({
      rel: 'self',
      href: `${baseUrl}/${resourceName}/${id}`,
      method: 'GET'
    });
  }

  // Common resource links
  switch (resourceName) {
    case 'user':
      if (id) {
        links.push({
          rel: 'profile',
          href: `${baseUrl}/user/profile`,
          method: 'GET'
        });
        links.push({
          rel: 'riot-profile',
          href: `${baseUrl}/user/riot-profile`,
          method: 'GET'
        });
        links.push({
          rel: 'link-riot',
          href: `${baseUrl}/user/link-riot-profile`,
          method: 'POST'
        });
        links.push({
          rel: 'logout',
          href: `${baseUrl}/authentication/log-out`,
          method: 'POST'
        });
      }
      break;

    case 'summoner':
      if (id && data.platform) {
        links.push({
          rel: 'spectator',
          href: `${baseUrl}/spectator/${data.platform}/${id}`,
          method: 'GET'
        });
      }
      break;

    case 'account':
      links.push({
        rel: 'link-riot',
        href: `${baseUrl}/user/link-riot-profile`,
        method: 'POST'
      });
      break;

    case 'authentication':
      links.push({
        rel: 'signup',
        href: `${baseUrl}/authentication/sign-in`,
        method: 'POST'
      });
      links.push({
        rel: 'login',
        href: `${baseUrl}/authentication/log-in`,
        method: 'POST'
      });
      break;
  }

  // Generic links
  links.push({
    rel: 'home',
    href: baseUrl,
    method: 'GET'
  });

  return {
    data,
    links
  };
}

export function addCollectionHATEOASLinks<T extends Record<string, any>>(
  data: T[],
  resourceName: string,
  baseUrl = 'http://localhost:3000',
  page = 1,
  pageSize = 20,
  totalCount?: number
): HATEOASResponse<T[]> {
  const links: HATEOASLink[] = [];

  links.push({
    rel: 'self',
    href: `${baseUrl}/${resourceName}?page=${page}&pageSize=${pageSize}`,
    method: 'GET'
  });

  if (page > 1) {
    links.push({
      rel: 'prev',
      href: `${baseUrl}/${resourceName}?page=${page - 1}&pageSize=${pageSize}`,
      method: 'GET'
    });
  }

  if (totalCount && page * pageSize < totalCount) {
    links.push({
      rel: 'next',
      href: `${baseUrl}/${resourceName}?page=${page + 1}&pageSize=${pageSize}`,
      method: 'GET'
    });
  }

  links.push({
    rel: 'create',
    href: `${baseUrl}/${resourceName}`,
    method: 'POST'
  });

  return {
    data,
    links
  };
}

