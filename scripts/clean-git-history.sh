#!/bin/bash
# Script para remover .env do histórico do Git (use com CUIDADO!)

echo "⚠️  ATENÇÃO: Este script vai reescrever o histórico do Git"
echo "Isso pode causar problemas se outras pessoas já clonaram o repositório"
echo ""
read -p "Tem certeza que deseja continuar? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Operação cancelada"
  exit 0
fi

echo "Removendo .env do histórico..."
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

echo "Limpando refs..."
rm -rf .git/refs/original/

echo "Garbage collection..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo "✅ Concluído!"
echo ""
echo "⚠️  IMPORTANTE:"
echo "1. Execute: git push origin --force --all"
echo "2. Rotacione suas credenciais do Supabase imediatamente"
echo "3. Avise sua equipe para fazer: git pull --rebase"
