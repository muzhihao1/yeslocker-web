#!/bin/bash

# Fix nested selectors in settings CSS

# Replace &.active with proper selectors
sed -i '' 's/&\.active/.section-badge.active/g' index.vue
sed -i '' 's/&\.inactive/.section-badge.inactive/g' index.vue

# Replace &:last-child with proper selectors
sed -i '' 's/&:last-child/.form-item:last-child/g' index.vue
sed -i '' 's/&:focus/.form-input:focus/g' index.vue
sed -i '' 's/&:disabled/button:disabled/g' index.vue

# Replace button nested selectors
sed -i '' 's/&\.test-btn/button.test-btn/g' index.vue
sed -i '' 's/&\.backup-btn/button.backup-btn/g' index.vue
sed -i '' 's/&\.save-btn\.primary/button.save-btn.primary/g' index.vue
sed -i '' 's/&\.cancel-btn/button.cancel-btn/g' index.vue

# Fix template-item last-child
sed -i '' '/\.template-item {/,/^}/ s/&:last-child/.template-item:last-child/' index.vue

# Fix template-actions last-child
sed -i '' '/\.template-actions {/,/^}/ s/&:last-child/.template-actions:last-child/' index.vue

echo "CSS fix completed"