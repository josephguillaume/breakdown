getNormalised <- function(x,start.pos,limit.val1,limit.val2)
  ifelse(abs(x-start.pos)<1e-5,0,
         ifelse(x>start.pos,
                (x-start.pos)/(limit.val2-start.pos),
                (start.pos-x)/(start.pos-limit.val1)
         ))