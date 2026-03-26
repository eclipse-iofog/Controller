#!/bin/bash
docker run -v ./docs:/docs mitjaziv/swagger-codegen-cli generate -i /docs/swagger.yaml -l swagger -o /docs