export const pngImage = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64',
);

export const jpegImage = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/ASP/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/ASP/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/As//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/ISf/2gAMAwEAAgADAAAAEP/EFBQRAQAAAAAAAAAAAAAAAAAAARD/2gAIAQMBAT8QH//EFBQRAQAAAAAAAAAAAAAAAAAAARD/2gAIAQIBAT8QH//EFBABAQAAAAAAAAAAAAAAAAAAARD/2gAIAQEAAT8QH//Z',
  'base64',
);

export const webpImage = Buffer.from(
  'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AA/v89WAAAAA==',
  'base64',
);

export const gifImage = Buffer.from('R0lGODlhAQABAAAAACwAAAAAAQABAAA=', 'base64');

export function multipartPayload(input: {
  fieldName?: string;
  filename?: string;
  contentType?: string;
  data: Buffer | string;
  boundary?: string;
}) {
  const boundary = input.boundary ?? '----gymnotebook-image-test';
  const contentTypeHeader =
    input.contentType === undefined ? [] : [`Content-Type: ${input.contentType}`];
  const head = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="${input.fieldName ?? 'image'}"; filename="${
      input.filename ?? 'image.bin'
    }"`,
    ...contentTypeHeader,
    '',
    '',
  ].join('\r\n');
  const tail = `\r\n--${boundary}--\r\n`;
  return {
    boundary,
    payload: Buffer.concat([
      Buffer.from(head, 'utf8'),
      Buffer.isBuffer(input.data) ? input.data : Buffer.from(input.data, 'utf8'),
      Buffer.from(tail, 'utf8'),
    ]),
  };
}
