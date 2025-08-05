#!/usr/bin/env python3
import re

def fix_nested_css(content):
    """Fix nested CSS selectors by converting them to plain CSS"""
    
    # Replace nested selectors within .section-badge
    content = re.sub(r'\.section-badge \{([^}]+)&\.active \{', r'.section-badge {\1}\n\n.section-badge.active {', content)
    content = re.sub(r'&\.inactive \{', r'}\n\n.section-badge.inactive {', content)
    
    # Replace nested selectors within .form-item
    content = re.sub(r'\.form-item \{([^}]+)&:last-child \{', r'.form-item {\1}\n\n.form-item:last-child {', content)
    
    # Replace nested selectors within .form-input
    content = re.sub(r'\.form-input \{([^}]+)&:focus \{', r'.form-input {\1}\n\n.form-input:focus {', content)
    
    # Replace nested selectors within .section-actions button
    content = re.sub(r'(\.section-actions[^{]*\{[^}]*button \{[^}]+)&\.test-btn \{', r'\1}\n\n.section-actions button.test-btn {', content)
    content = re.sub(r'&\.backup-btn \{', r'}\n\n.section-actions button.backup-btn {', content)
    content = re.sub(r'&\.save-btn\.primary \{', r'}\n\n.section-actions button.save-btn.primary {', content)
    content = re.sub(r'&:disabled \{', r'}\n\n.section-actions button:disabled {', content)
    
    # Replace nested selectors within .template-item
    content = re.sub(r'\.template-item \{([^}]+)&:last-child \{', r'.template-item {\1}\n\n.template-item:last-child {', content)
    
    # Replace nested selectors within .info-item
    content = re.sub(r'\.info-item \{([^}]+)&:last-child \{', r'.info-item {\1}\n\n.info-item:last-child {', content)
    
    # Replace nested selectors within .template-editor button
    content = re.sub(r'(\.template-editor[^{]*\{[^}]*button \{[^}]+)&\.cancel-btn \{', r'\1}\n\n.template-editor button.cancel-btn {', content)
    content = re.sub(r'&\.save-btn\.primary \{', r'}\n\n.template-editor button.save-btn.primary {', content)
    
    return content

# Read the file
with open('index.vue', 'r') as f:
    content = f.read()

# Find the style section
style_start = content.find('<style lang="css" scoped>')
style_end = content.find('</style>', style_start)

if style_start != -1 and style_end != -1:
    # Extract style content
    style_content = content[style_start:style_end + len('</style>')]
    
    # Fix nested selectors manually with specific replacements
    # This is a more manual approach but more accurate for this specific file
    
    replacements = [
        # section-badge
        ('  &.active {', '}\n\n.section-badge.active {'),
        ('  &.inactive {', '}\n\n.section-badge.inactive {'),
        
        # form-item
        ('  &:last-child {', '}\n\n.form-item:last-child {'),
        
        # form-input
        ('  &:focus {', '}\n\n.form-input:focus {'),
        
        # section-actions button
        ('    &.test-btn {', '  }\n}\n\n.section-actions button.test-btn {'),
        ('    &.backup-btn {', '}\n\n.section-actions button.backup-btn {'),
        ('    &.save-btn.primary {', '}\n\n.section-actions button.save-btn.primary {'),
        ('    &:disabled {', '}\n\n.section-actions button:disabled {'),
        
        # template-item
        ('  &:last-child {', '}\n\n.template-item:last-child {'),
        
        # info-item  
        ('  &:last-child {', '}\n\n.info-item:last-child {'),
        
        # template-editor button
        ('    &.cancel-btn {', '  }\n}\n\n.template-editor button.cancel-btn {'),
        ('    &.save-btn.primary {', '}\n\n.template-editor button.save-btn.primary {'),
    ]
    
    fixed_style = style_content
    for old, new in replacements:
        if old in fixed_style:
            fixed_style = fixed_style.replace(old, new, 1)
    
    # Remove extra closing braces that might have been created
    fixed_style = re.sub(r'}\s*}\s*}', '}', fixed_style)
    
    # Reconstruct the file
    new_content = content[:style_start] + fixed_style + content[style_end + len('</style>'):]
    
    # Write back
    with open('index.vue', 'w') as f:
        f.write(new_content)
    
    print("CSS fixes applied successfully!")
else:
    print("Could not find style section!")