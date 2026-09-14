#!/usr/bin/env bash
# Set the Directus (cms) secrets on Railway without going through the dashboard form.
#
#   infra/scripts/set-cms-secrets.sh production
#   infra/scripts/set-cms-secrets.sh staging
#
# Each value is typed at a hidden prompt, sent to Railway on stdin (never on the command
# line, so never in shell history or `ps`), and only its LENGTH is printed back.
# Press Enter on an empty prompt to leave that variable untouched.
# SECRET can be generated here: nobody needs to know it, it only has to stay stable.

set -euo pipefail

RAILWAY="${RAILWAY_BIN:-railway}"
SERVICE="cms"
ENVIRONMENT="${1:-}"

case "$ENVIRONMENT" in
  production|staging) ;;
  *) echo "Usage: $0 <production|staging>" >&2; exit 2 ;;
esac

command -v "$RAILWAY" >/dev/null || { echo "✗ railway CLI introuvable" >&2; exit 1; }

set_var() {
  local key="$1" value="$2"
  # Delete first: a sealed variable may refuse an in-place update. Missing key is fine.
  "$RAILWAY" variable delete "$key" --service "$SERVICE" --environment "$ENVIRONMENT" >/dev/null 2>&1 || true
  printf '%s' "$value" | "$RAILWAY" variable set "$key" --stdin --service "$SERVICE" --environment "$ENVIRONMENT" --skip-deploys >/dev/null
  echo "  ✓ $key enregistrée (${#value} caractères)"
}

ask() {
  local key="$1" label="$2" hidden="$3" value=""
  if [ "$hidden" = "hidden" ]; then
    read -rsp "$label : " value; echo
  else
    read -rp "$label : " value
  fi
  # A paste containing a line break would silently answer the NEXT prompt with its second line.
  # Input still pending right after the read means that happened: discard it and stop.
  if [ -t 0 ]; then
    local extra leftover=""
    while IFS= read -rs -t 1 extra; do leftover=1; done
    if [ -n "$leftover" ]; then
      echo "  ✗ $key : le collage contenait plusieurs lignes. Rien n'est enregistré pour cette variable ni les suivantes." >&2
      echo "    Copie la valeur seule (sans retour à la ligne), puis relance le script." >&2
      exit 1
    fi
  fi
  # Trim surrounding whitespace pasted by accident.
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  if [ -z "$value" ]; then
    echo "  – $key inchangée"
    return 0
  fi
  set_var "$key" "$value"
}

echo "Secrets Directus → service $SERVICE, environnement $ENVIRONMENT"
echo "(Entrée sur une ligne vide = ne pas modifier cette variable)"
echo

read -rp "Générer un nouveau SECRET ? Répondre oui seulement au premier démarrage [o/N] : " gen
if [ "$gen" = "o" ] || [ "$gen" = "O" ]; then
  set_var SECRET "$(openssl rand -base64 48 | tr -d '\n')"
else
  echo "  – SECRET inchangé"
fi

ask ADMIN_EMAIL "E-mail du compte admin" visible
ask ADMIN_PASSWORD "Mot de passe admin (saisie masquée)" hidden
ask LICENSE_KEY "Clé de licence Directus (saisie masquée)" hidden
ask EMAIL_SMTP_PASSWORD "Clé API Resend re_… (saisie masquée)" hidden

echo
read -rp "Redéployer cms ($ENVIRONMENT) maintenant ? [o/N] : " deploy
if [ "$deploy" = "o" ] || [ "$deploy" = "O" ]; then
  "$RAILWAY" redeploy --service "$SERVICE" --environment "$ENVIRONMENT" --yes >/dev/null
  echo "✓ Redéploiement lancé. Suis-le dans Railway, ou demande à Claude de lire les logs."
else
  echo "Rien n'est déployé. Pense à cliquer sur Deploy dans Railway."
fi
