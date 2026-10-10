export type Site = 'nyaa' | 'sukebei';
export class ApiError extends Error {
  constructor(public status: number, public detail: unknown) { super(String(detail)); }
}
const categories: Record<Site, Record<string, [number, Record<string, number>]>> = {
  nyaa: {
    anime: [1, { amv: 1, eng: 2, 'non-eng': 3, raw: 4 }],
    audio: [2, { lossless: 1, lossy: 2 }],
    manga: [3, { eng: 1, 'non-eng': 2, raw: 3 }],
    live_action: [4, { eng: 1, promo: 2, 'non-eng': 3, raw: 4 }],
    pictures: [5, { graphics: 1, photos: 2 }],
    software: [6, { applications: 1, games: 2 }]
  },
  sukebei: { art: [1, { anime: 1, doujinshi: 2, manga: 3, games: 4, pictures: 5 }],
    real: [2, { photos: 1, videos: 2 }] }
};
export function integer(value: string, location: 'query' | 'path', name: string): number {
  // Pydantic accepts whitespace, signs, and integer-valued decimal strings.
  if (!/^[+-]?\d+(?:\.0+)?$/.test(value.trim())) {
    throw new ApiError(422, [{
      type: 'int_parsing', loc: [location, name],
      msg: 'Input should be a valid integer, unable to parse string as an integer',
      input: value, url: 'https://errors.pydantic.dev/2.11/v/int_parsing'
    }]);
  }
  return Number(value);
}
export function buildQuery(site: Site, params: URLSearchParams) {
  const get = (key: string) => params.getAll(key).at(-1);
  const page = integer(get('page') ?? '1', 'query', 'page');
  const category = get('category'), sub = get('sub_category');
  const sort = get('sort'), order = get('order');
  const error = (detail: string): never => { throw new ApiError(400, detail); };
  if (sub && !category) error('Category and sub category must be used together.');
  const selected = category ? categories[site][category] : undefined;
  if (category && !selected) error('Invalid category. Refer to docs for more info.');
  if (sub && !selected?.[1][sub]) error('Invalid sub category. Refer to docs for more info.');
  if (sort && !['size', 'id', 'seeders', 'leechers', 'downloads'].includes(sort))
    error("Invalid sorting attribute. Allowed values are 'size', 'id', 'seeders', 'leechers' or 'downloads'.");
  if (order && !['asc', 'desc'].includes(order))
    error("Invalid sorting order. Allowed values are 'asc' or 'desc'");
  const query = new URLSearchParams({ f: '0', c: selected ? selected[0] + '_' + (sub ? selected[1][sub] : 0) : '0_0', p: BigInt((get('page') ?? '1').trim().replace(/\.0+$/, '')).toString() });
  if (get('q')) query.set('q', get('q')!);
  if (sort) query.set('s', sort);
  if (order) query.set('o', order);
  return query;
}
