# Binaries

Coloque aqui o `WinSW.exe` que sera distribuido com o pacote Windows.

Nome esperado:

- `WinSW.exe`
- `WinSW-x64.exe` tambem e aceito pelo build, se preferir manter o nome original

No stage final, ele sera copiado como:

- `PharmaConnectorAgent.exe`

Se preferir outro wrapper ou outro nome de binario, ajuste:

- `packaging/windows/build.ps1`
- `packaging/windows/inno/pharma-agent.iss`
- `packaging/windows/service/PharmaConnectorAgent.xml`
