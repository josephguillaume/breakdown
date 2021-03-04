breakdown
=========

Web tool to hierarchically break down and edit an analysis and identify breakeven or cross-over points. 

Based on [opencpu](https://www.opencpu.org/) in R. For more information and other implementations of crossover point scenarios, see https://github.com/josephguillaume/crossover

Try it online: http://josephguillaume.ocpu.io/breakdown/www/

Locally (automatically downloaded from github):
```R
library(opencpu)
ocpu_start_app("josephguillaume/breakdown")
```

Locally with a local installation of the package
```R
devtools::install_github("josephguillaume/breakdown")
library(opencpu)
ocpu_start_app("breakdown")
```
