function errorResponse(...errorMessages) {
  return {
    errors: {
      body: errorMessages,
    },
  };
}

module.exports = errorResponse;
