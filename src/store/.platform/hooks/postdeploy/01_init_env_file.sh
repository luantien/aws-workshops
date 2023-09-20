#!/bin/bash

# Copy Beanstalk environment variables to .env file
printf "%s\n" "$( /opt/elasticbeanstalk/bin/get-config --output YAML environment | sed -r 's/:\s/=/')" > .env
