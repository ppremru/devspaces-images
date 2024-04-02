# Copyright (c) 2024 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

# The Dockerfile works only in Brew, as it is customized for Cachito fetching
# project sources and npm dependencies, and performing an offline build with them

# https://registry.access.redhat.com/ubi8/nodejs-18
FROM registry.access.redhat.com/ubi8/nodejs-18:1-94
USER 0

# WORKDIR /idea-dist/
WORKDIR $REMOTE_SOURCES_DIR/devspaces-images-idea/app/devspaces-idea-server/

# cachito:yarn step 1: copy cachito sources where we can use them; source env vars; set working dir
COPY $REMOTE_SOURCES $REMOTE_SOURCES_DIR

# hadolint ignore=SC2086
RUN source $REMOTE_SOURCES_DIR/devspaces-images-idea/cachito.env

COPY artifacts/ideaIU-*.tar.gz /idea-dist/

RUN cp -r build/dockerfiles/*.sh /
RUN cp -r status-app /idea-dist/status-app/

# Create a directory for mounting a volume.
RUN mkdir /idea-server

# Adjust permissions on some items so they're writable by group root.
# hadolint ignore=SC2086
RUN for f in "${HOME}" "/etc/passwd" "/etc/group" "/idea-dist/status-app" "/idea-server"; do\
        chgrp -R 0 ${f} && \
        chmod -R g+rwX ${f}; \
    done

# Build the status app.
WORKDIR /idea-dist/status-app/
RUN npm install

# Switch to unprivileged user.
USER 1001

ENTRYPOINT /entrypoint.sh

ENV SUMMARY="Red Hat OpenShift Dev Spaces with IntelliJ IDEA Ultimate IDE container" \
    DESCRIPTION="Red Hat OpenShift Dev Spaces with IntelliJ IDEA Ultimate IDE container" \
    PRODNAME="devspaces" \
    COMPNAME="ideaIU-rhel8"
LABEL summary="$SUMMARY" \
      description="$DESCRIPTION" \
      io.k8s.description="$DESCRIPTION" \
      io.k8s.display-name="$DESCRIPTION" \
      io.openshift.tags="$PRODNAME,$COMPNAME" \
      com.redhat.component="$PRODNAME-$COMPNAME-container" \
      name="$PRODNAME/$COMPNAME" \
      version="3.13" \
      license="EPLv2" \
      maintainer="Artem Zatsarynnyi <azatsary@redhat.com>" \
      io.openshift.expose-services="" \
      usage=""
