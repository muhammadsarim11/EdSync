import crypto from 'crypto';

const slugify = (name) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const generateUniqueSlug = async (name, OrganizationModel) => {
  const base = slugify(name) || 'institute';
  let slug = base;

  while (await OrganizationModel.exists({ slug })) {
    slug = `${base}-${crypto.randomBytes(3).toString('hex')}`;
  }

  return slug;
};
