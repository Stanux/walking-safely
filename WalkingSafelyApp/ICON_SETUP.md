# Configuração do Ícone do App

Para configurar o ícone do app com a nova imagem do logo, siga os passos:

## 1. Salvar a imagem do logo

Salve a imagem do logo (escudo azul com caminho) no arquivo:
- `WalkingSafelyApp/src/assets/images/logo.png`

## 2. Gerar ícones para Android

Use uma ferramenta como [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html) ou [App Icon Generator](https://www.appicon.co/) para gerar os ícones nos tamanhos corretos:

### Tamanhos necessários para Android:

| Pasta | Tamanho |
|-------|---------|
| mipmap-mdpi | 48x48 px |
| mipmap-hdpi | 72x72 px |
| mipmap-xhdpi | 96x96 px |
| mipmap-xxhdpi | 144x144 px |
| mipmap-xxxhdpi | 192x192 px |

### Arquivos a substituir:

```
WalkingSafelyApp/android/app/src/main/res/
├── mipmap-mdpi/
│   ├── ic_launcher.png (48x48)
│   └── ic_launcher_round.png (48x48)
├── mipmap-hdpi/
│   ├── ic_launcher.png (72x72)
│   └── ic_launcher_round.png (72x72)
├── mipmap-xhdpi/
│   ├── ic_launcher.png (96x96)
│   └── ic_launcher_round.png (96x96)
├── mipmap-xxhdpi/
│   ├── ic_launcher.png (144x144)
│   └── ic_launcher_round.png (144x144)
└── mipmap-xxxhdpi/
    ├── ic_launcher.png (192x192)
    └── ic_launcher_round.png (192x192)
```

## 3. Splash Screen Nativa (Android)

Para a splash screen nativa do Android, adicione a imagem em:
- `WalkingSafelyApp/android/app/src/main/res/drawable/splash_logo.png`

E atualize o `styles.xml` conforme necessário.

## Comandos úteis

Após substituir os ícones, limpe o cache e rebuild:

```bash
cd WalkingSafelyApp/android
./gradlew clean
cd ..
npx react-native run-android
```
