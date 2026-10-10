import { load } from 'cheerio/slim';

const number = (text: string) => Number(text.replaceAll(',', '').trim()) || 0;
const absolute = (path: string | undefined, base: string) => path ? new URL(path, base).href : '';

export function parseSearch(html: string, base: string) {
  const $ = load(html);
  const data = $('.torrent-list tbody tr').toArray().flatMap(row => {
    const r = $(row), cells = r.children('td');
    const title = r.find('a[href^="/view/"]').not('.comments').first();
    if (!title.length) return [];
    const tail = cells.slice(-5);
    return [{
      category: cells.first().find('a').attr('title') ?? '',
      title: title.text().trim(),
      link: absolute(title.attr('href'), base),
      torrent: absolute(r.find('a[href^="/download/"]').attr('href'), base),
      magnet: r.find('a[href^="magnet:"]').attr('href') ?? '',
      size: tail.eq(0).text().trim(),
      time: tail.eq(1).text().trim(),
      seeders: number(tail.eq(2).text()),
      leechers: number(tail.eq(3).text()),
      downloads: number(tail.eq(4).text())
    }];
  });
  return { count: data.length, data };
}

export function parseDetail(html: string, base: string, id: string) {
  const $ = load(html), panel = $('.panel').first();
  if (!panel.find('.panel-title').length) throw new Error('Invalid torrent ID.');
  const fields: Record<string, string | number> = {};
  const names: Record<string, string> = {
    Category: 'category', Date: 'time', Submitter: 'uploader', Seeders: 'seeders',
    Information: 'information', Leechers: 'leechers', 'File size': 'size',
    Completed: 'downloads', 'Info hash': 'infohash'
  };
  panel.find('.panel-body .row').children().each((_, el) => {
    const label = $(el).text().trim().replace(/:$/, ''), key = names[label];
    if (key) {
      const text = $(el).next().text().trim();
      fields[key] = ['seeders', 'leechers', 'downloads'].includes(key) ? number(text) : text;
    }
  });
  const comments = $('#comments .comment-panel').toArray().map(el => {
    const c = $(el);
    return {
      user: c.find('.col-md-2 a').first().text().trim(),
      time: c.find('[data-timestamp]').first().text().trim(),
      comment: c.find('.comment-content').text().trim()
    };
  });
  return { data: { ...fields, title: panel.find('.panel-title').text().trim(),
    link: absolute('/view/' + id, base),
    torrent: absolute(panel.find('a[href^="/download/"]').attr('href'), base),
    magnet: panel.find('a[href^="magnet:"]').attr('href') ?? '', comments } };
}
