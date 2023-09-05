[![test](https://github.com/yszk0123/simple-bugspots/actions/workflows/main.yml/badge.svg)](https://github.com/yszk0123/simple-bugspots/actions/workflows/main.yml)

# simple-bugspots

## Usage

```ts
import { Bugspots } from 'simple-bugspots';

const bugspots = new Bugspots();
const spots = await bugspots.scan();
console.log(spots);
```

## Debug

```bash
$ npx tsx src/debug.ts <flags>
```
