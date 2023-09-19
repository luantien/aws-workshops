#!/bin/bash

# Copy Beanstalk environment variables to .env file
echo $(/opt/elasticbeanstalk/bin/get-config --output YAML environment | sed -r 's/: /=/' | xargs) >> .env
