# Cedar calendar dependency lane

The composed Cedar fixture can opt into this manifest pair with `--cedar-calendar`. The baseline
dependencies are unchanged. The lock adds DayPicker 10.0.2, its matching calendar implementation,
and two date libraries. The attached MIT notices come from the pinned distribution packages.

| Locked addition | Version | Notice |
| --- | --- | --- |
| @daypicker/react | 10.0.2 | [MIT](notices/daypicker-react.txt) |
| react-day-picker | 10.0.2 | [MIT](notices/react-day-picker.txt) |
| @date-fns/tz | 1.5.0 | [MIT](notices/date-fns-tz.txt) |
| date-fns | 4.4.0 | [MIT](notices/date-fns.txt) |

Build the image in a disposable context containing only this manifest pair and the
[isolated Dockerfile](../Dockerfile). Use the resulting exact image ID with the owned local
runner. The runner compares both fixture manifests and image manifests against these inputs
before creating the database. Runtime containers use the existing isolated network policy.
