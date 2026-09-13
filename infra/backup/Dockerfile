# Daily Postgres backup: dump, prove it restores, encrypt, upload.
# The client major version must be >= the server's (Postgres 17).
FROM postgres:17-alpine

RUN apk add --no-cache aws-cli age

COPY backup.sh /usr/local/bin/obiou-backup
RUN chmod +x /usr/local/bin/obiou-backup

USER postgres
ENTRYPOINT []
CMD ["/usr/local/bin/obiou-backup"]
