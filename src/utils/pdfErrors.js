export const classifyPdfError = (error, fallback = 'Operation failed. Please try again.') => {
  const message = String(error?.message || error || '').toLowerCase();
  const name = String(error?.name || '').toLowerCase();

  if (name.includes('password') || message.includes('password') || message.includes('encrypted')) {
    return {
      message: 'This PDF is password-protected. Please unlock it first.',
      type: 'error'
    };
  }

  if (
    name.includes('invalidpdf') ||
    name.includes('missingpdf') ||
    name.includes('formaterror') ||
    message.includes('invalid pdf') ||
    message.includes('corrupt') ||
    message.includes('format error')
  ) {
    return {
      message: 'The PDF appears to be corrupted or unsupported.',
      type: 'error'
    };
  }

  return { message: fallback, type: 'error' };
};
