client.global.set("search", "test");
  client.test("Request executed successfully", function() {

      client.assert(response.status === 200, "Response status is not 200");
  });